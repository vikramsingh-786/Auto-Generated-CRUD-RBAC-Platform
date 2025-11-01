import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { ModelDefinitionCacheService } from './model-definition.cache.service';
import {
  ModelDefinition,
  FieldDefinition,
  DbColumnInfo,
  FieldType,
} from './model.types';

const MODELS_DIR = path.join(process.cwd(), 'models');
const RESERVED_NAMES = ['user', 'migration', 'enum']; 

function isValidIdentifier(name: string): boolean {
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return regex.test(name) && name.length > 0;
}

function isValidDefaultValue(value: any, type: FieldType): boolean {
  if (value === null || value === undefined || value === '') return true; 

  const valueStr = String(value);
  if (valueStr.includes(';') || valueStr.includes('--')) return false;
  const forbidden = [
    'DROP',
    'DELETE',
    'INSERT',
    'UPDATE',
    'ALTER',
    'CREATE',
    'TABLE',
    'SCHEMA',
    'SELECT',
  ]; 
  const regex = new RegExp(`\\b(${forbidden.join('|')})\\b`, 'i');
  if (regex.test(valueStr)) return false;

  if (type === 'number' && isNaN(Number(valueStr))) return false;

  if (
    type === 'boolean' &&
    valueStr.toLowerCase() !== 'true' &&
    valueStr.toLowerCase() !== 'false'
  )
    return false;
  if (type === 'date') {
    try {
      if (isNaN(new Date(valueStr).getTime())) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

@Injectable()
export class ModelDefinitionsService {
  private readonly logger = new Logger(ModelDefinitionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ModelDefinitionCacheService,
  ) {
    this.ensureModelsDirectory();
  }

  private ensureModelsDirectory() {
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
      this.logger.warn(
        `'models' directory not found, created at: ${MODELS_DIR}`,
      );
    }
  }

  async publishModel(
    modelDefinition: ModelDefinition, 
  ): Promise<{ message: string; changes?: string[]; model: ModelDefinition }> {
    this.validateModelDefinition(modelDefinition); 

    const modelName = modelDefinition.name;
    modelDefinition.tableName =
      modelDefinition.tableName || modelName.toLowerCase();
    const filePath = path.join(MODELS_DIR, `${modelName}.json`);

    if (!modelDefinition.rbac) {
      modelDefinition.rbac = {
        Admin: ['all'],
        Manager: ['create', 'read', 'update'],
        Viewer: ['read'],
      };
    }
    if (
      modelDefinition.ownerField &&
      !modelDefinition.fields.find((f) => f.name === modelDefinition.ownerField)
    ) {
      modelDefinition.fields.push({
        name: modelDefinition.ownerField,
        type: 'number', 
        required: false, 
      });
      this.logger.verbose(
        `Added ownerField '${modelDefinition.ownerField}' to model fields for schema generation.`,
      );
    }

    const currentSchema = await this.getTableSchema(modelDefinition.tableName);
    const tableExists = currentSchema.length > 0;

    let response: { message: string; changes?: string[] };

    if (!tableExists) {
      response = await this.createTable(modelDefinition);
    } else {
      response = await this.migrateTable(modelDefinition, currentSchema);
    }

    fs.writeFileSync(filePath, JSON.stringify(modelDefinition, null, 2));
    this.cacheService.loadModel(modelName);

    return { ...response, model: modelDefinition };
  }

  async deleteModel(modelName: string): Promise<{ message: string }> {
    if (!isValidIdentifier(modelName)) {
      throw new BadRequestException('Invalid model name provided.');
    }

    const filePath = path.join(MODELS_DIR, `${modelName}.json`);
    const tableName = modelName.toLowerCase();

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(
        `Model definition file for '${modelName}' not found.`,
      );
    }

    try {

      await this.prisma.$executeRawUnsafe(
        `DROP TABLE IF EXISTS "${tableName}" CASCADE;`,
      );
      fs.unlinkSync(filePath); 
      this.cacheService.removeModel(modelName); 
      this.logger.log(
        `Model '${modelName}' and its table deleted successfully.`,
      );
      return {
        message: `Model '${modelName}' and its table deleted successfully.`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete model '${modelName}' and table '${tableName}'. Error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to delete model and table due to a database error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createTable(
    modelDefinition: ModelDefinition,
  ): Promise<{ message: string; changes?: string[] }> {
    if (modelDefinition.fields.length === 0) {
      throw new BadRequestException(
        'A model must have at least one valid field.',
      );
    }

    const tableName = modelDefinition.tableName;
    const systemFields = [
      `"id" SERIAL PRIMARY KEY`,
      `"createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
      `"updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
    ];

    const userDefinedFields = modelDefinition.fields.map((field) =>
      this.mapFieldToSql(field),
    );

    const allFields = [...systemFields, ...userDefinedFields].join(', ');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (${allFields});
    `;

    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE 'plpgsql';
    `;

    const dropTriggerQuery = `
      DROP TRIGGER IF EXISTS set_updated_at ON "${tableName}";
    `;

    const createTriggerQuery = `
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "${tableName}"
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    try {
      await this.prisma.$transaction([
        this.prisma.$executeRawUnsafe(createTableQuery),
        this.prisma.$executeRawUnsafe(createFunctionQuery),
        this.prisma.$executeRawUnsafe(dropTriggerQuery),
        this.prisma.$executeRawUnsafe(createTriggerQuery),
      ]);

      this.logger.log(`Table '${tableName}' created successfully.`);
      return {
        message: `Model '${modelDefinition.name}' published and table created successfully!`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create table '${tableName}'. Error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to create database table. Check field names, types, or if a table with this name already exists.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async migrateTable(
    modelDefinition: ModelDefinition,
    currentSchema: DbColumnInfo[],
  ): Promise<{ message: string; changes: string[] }> {
    const tableName = modelDefinition.tableName;
    const newFields = modelDefinition.fields;
    const existingColumnNames = currentSchema.map((c) => c.column_name);
    const newFieldNames = newFields.map((f) => f.name);

    const migrationQueries: string[] = [];
    const migrationLog: string[] = [];

    const protectedColumns = ['id', 'createdAt', 'updatedAt'].filter(Boolean);
    if (modelDefinition.ownerField) {
      protectedColumns.push(modelDefinition.ownerField);
    }

    const columnsToAdd = newFields.filter(
      (field) => !existingColumnNames.includes(field.name),
    );
    for (const field of columnsToAdd) {
      const fieldSql = this.mapFieldToSql(field);
      migrationQueries.push(
        `ALTER TABLE "${tableName}" ADD COLUMN ${fieldSql};`,
      );
      migrationLog.push(`➕ Adding column: ${field.name} (${field.type})`);
    }
    const columnsToDrop = existingColumnNames.filter(
      (col) => !newFieldNames.includes(col) && !protectedColumns.includes(col),
    );
    for (const columnName of columnsToDrop) {
      migrationQueries.push(
        `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}" CASCADE;`,
      ); 
      migrationLog.push(`➖ Removing column: ${columnName}`);
    }

    for (const field of newFields) {
      const existingColumn = currentSchema.find(
        (c) => c.column_name === field.name,
      );
      if (existingColumn && !protectedColumns.includes(field.name)) {
        const currentFieldType = this.mapDbTypeToFieldType(
          existingColumn.data_type,
        );
        const newSqlType = this.mapFieldTypeToSqlType(field.type);
        if (
          currentFieldType &&
          currentFieldType !== field.type &&
          newSqlType
        ) {
          let usingClause = '';
          if (field.type === 'string') {
            usingClause = `USING "${field.name}"::TEXT`;
          } else if (field.type === 'number') {
            usingClause = `USING CASE WHEN "${field.name}"::TEXT ~ '^[0-9.]+$' THEN "${field.name}"::TEXT::FLOAT ELSE 0 END`;
          } else if (field.type === 'boolean') {
            usingClause = `USING CASE WHEN "${field.name}"::TEXT ILIKE 'true' THEN TRUE WHEN "${field.name}"::TEXT ILIKE 'false' THEN FALSE ELSE NULL END`;
          } else if (field.type === 'date') {
            usingClause = `USING "${field.name}"::TIMESTAMP WITH TIME ZONE`;
          }
          migrationQueries.push(
            `ALTER TABLE "${tableName}" ALTER COLUMN "${field.name}" TYPE ${newSqlType} ${usingClause};`,
          );
          migrationLog.push(
            `🔄 Changing column type: ${field.name} (${currentFieldType} → ${field.type})`,
          );
        }

        const isCurrentlyNullable = existingColumn.is_nullable === 'YES';
        const shouldBeRequired = field.required === true;

        if (shouldBeRequired && isCurrentlyNullable) {
          const defaultValue = this.getDefaultValueForType(field.type);
          if (defaultValue !== undefined) {
            migrationQueries.push(
              `UPDATE "${tableName}" SET "${field.name}" = ${this.quoteDefaultValue(
                defaultValue,
                field.type,
              )} WHERE "${field.name}" IS NULL;`,
            );
            migrationLog.push(
              `➡️ Setting default for NULLs before making '${field.name}' NOT NULL.`,
            );
          }
          migrationQueries.push(
            `ALTER TABLE "${tableName}" ALTER COLUMN "${field.name}" SET NOT NULL;`,
          );
          migrationLog.push(`🔒 Making column required: ${field.name}`);
        } else if (!shouldBeRequired && !isCurrentlyNullable) {
          migrationQueries.push(
            `ALTER TABLE "${tableName}" ALTER COLUMN "${field.name}" DROP NOT NULL;`,
          );
          migrationLog.push(`🔓 Making column optional: ${field.name}`);
        }

        const newDefaultSql =
          field.default !== undefined && field.default !== null && field.default !== ''
            ? this.quoteDefaultValue(field.default, field.type)
            : null;
        const currentDefaultSql = existingColumn.column_default;

        if (newDefaultSql !== currentDefaultSql) {
          if (newDefaultSql) {
            migrationQueries.push(
              `ALTER TABLE "${tableName}" ALTER COLUMN "${field.name}" SET DEFAULT ${newDefaultSql};`,
            );
            migrationLog.push(
              `➡️ Setting default for '${field.name}' to ${newDefaultSql}.`,
            );
          } else if (currentDefaultSql) {
         
            migrationQueries.push(
              `ALTER TABLE "${tableName}" ALTER COLUMN "${field.name}" DROP DEFAULT;`,
            );
            migrationLog.push(`➡️ Removing default for '${field.name}'.`);
          }
        }
      }
    }

    if (migrationQueries.length === 0) {
      return {
        message: `ℹ️ Model '${modelDefinition.name}' is already up to date — no schema changes needed.`,
        changes: [],
      };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const query of migrationQueries) {
          await tx.$executeRawUnsafe(query);
        }
      });
      this.logger.log(`Migration for '${tableName}' completed successfully.`);
      migrationLog.forEach((log) => this.logger.verbose(`  ${log}`));
      return {
        message: `✅ Model '${modelDefinition.name}' updated successfully with ${migrationQueries.length} schema change(s).`,
        changes: migrationLog,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Migration for '${tableName}' failed. Error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to update database schema: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTableSchema(tableName: string): Promise<DbColumnInfo[]> {
    try {
      return await this.prisma.$queryRaw<DbColumnInfo[]>`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;
    } catch (error: any) {
      this.logger.error(
        `Error fetching schema for table ${tableName}: ${error.message}`,
      );
      return []; 
    }
  }

  private mapDbTypeToFieldType(dbType: string): FieldType | null {
    const lowerType = dbType.toLowerCase();
    if (
      lowerType.includes('text') ||
      lowerType.includes('char') ||
      lowerType.includes('uuid')
    )
      return 'string';
    if (
      lowerType.includes('int') ||
      lowerType.includes('float') ||
      lowerType.includes('double') ||
      lowerType.includes('numeric') ||
      lowerType.includes('decimal')
    )
      return 'number';
    if (lowerType.includes('bool')) return 'boolean';
    if (lowerType.includes('timestamp') || lowerType.includes('date'))
      return 'date';
 
    return null; 
  }

  private mapFieldTypeToSqlType(fieldType: FieldType): string | null {
    switch (fieldType) {
      case 'string':
        return 'TEXT';
      case 'number':
        return 'FLOAT'; 
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'TIMESTAMP WITH TIME ZONE'; 
      case 'relation':
        return 'INTEGER'; 
      default:
        return null; 
    }
  }

  private mapFieldToSql(field: FieldDefinition): string {
    if (!isValidIdentifier(field.name)) {
      throw new BadRequestException(
        `Invalid field name '${field.name}' for SQL identifier.`,
      );
    }

    const sqlType = this.mapFieldTypeToSqlType(field.type);
    if (!sqlType) {
      throw new BadRequestException(`Unsupported field type: ${field.type}`);
    }

    let sql = `"${field.name}" ${sqlType}`;

    if (field.type === 'relation') {
      if (!field.targetModel) {
        throw new BadRequestException(
          `Target model is required for relation field '${field.name}'.`,
        );
      }
      if (!isValidIdentifier(field.targetModel)) {
        throw new BadRequestException(
          `Invalid target model name '${field.targetModel}' for relation field '${field.name}'.`,
        );
      }
      sql += ` REFERENCES "${field.targetModel.toLowerCase()}"("id") ON DELETE SET NULL`;
    }

    if (field.required) sql += ' NOT NULL';
    if (field.unique) sql += ' UNIQUE';

    if (
      field.default !== undefined &&
      field.default !== null &&
      field.default !== ''
    ) {
      if (!isValidDefaultValue(field.default, field.type)) {
        throw new BadRequestException(
          `Invalid default value for field '${field.name}'. Potential SQL injection or type mismatch detected.`,
        );
      }
      sql += ` DEFAULT ${this.quoteDefaultValue(field.default, field.type)}`;
    }
    return sql;
  }

  private quoteDefaultValue(value: any, type: FieldType): string {
    switch (type) {
      case 'string':
      case 'date':
        return `'${String(value).replace(/'/g, "''")}'`;
      case 'boolean':
        return String(value).toLowerCase() === 'true' ? 'TRUE' : 'FALSE';
      case 'number':
      case 'relation':
        const num = Number(value);
        if (isNaN(num)) {
          throw new BadRequestException(`Invalid numeric default value: ${value}`);
        }
        return String(num);
      default:
        return `'${String(value).replace(/'/g, "''")}'`;
    }
  }

  private getDefaultValueForType(type: FieldType): any {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'date':
        return '1970-01-01T00:00:00Z';
      case 'relation':
        return null; 
      default:
        return null;
    }
  }

  private validateModelDefinition(modelDefinition: ModelDefinition) {
    if (!modelDefinition.name || !modelDefinition.fields) {
      throw new BadRequestException(
        'Model name and fields array are required.',
      );
    }

    if (!isValidIdentifier(modelDefinition.name)) {
      throw new BadRequestException(
        `Model name '${modelDefinition.name}' is not valid. It must start with a letter or underscore and contain only letters, numbers, or underscores.`,
      );
    }
    if (RESERVED_NAMES.includes(modelDefinition.name.toLowerCase())) {
      throw new BadRequestException(
        `The model name '${modelDefinition.name}' is a reserved keyword. Please choose a different name.`,
      );
    }

    if (
      modelDefinition.tableName &&
      !isValidIdentifier(modelDefinition.tableName)
    ) {
      throw new BadRequestException(
        `Table name '${modelDefinition.tableName}' is not valid. It must start with a letter or underscore and contain only letters, numbers, or underscores.`,
      );
    }

    const fieldNames = new Set<string>();
    for (const field of modelDefinition.fields) {
      if (!isValidIdentifier(field.name)) {
        throw new BadRequestException(
          `Invalid field name '${field.name}'. Field names must start with a letter or underscore and contain only letters, numbers, or underscores.`,
        );
      }
      if (fieldNames.has(field.name.toLowerCase())) {
        throw new BadRequestException(
          `Duplicate field name '${field.name}' in model '${modelDefinition.name}'.`,
        );
      }
      fieldNames.add(field.name.toLowerCase());

      if (field.type === 'relation') {
        if (!field.targetModel) {
          throw new BadRequestException(
            `Target model is required for relation field '${field.name}'.`,
          );
        }
        if (!isValidIdentifier(field.targetModel)) {
          throw new BadRequestException(
            `Invalid target model name '${field.targetModel}' for relation field '${field.name}'.`,
          );
        }
        if (!this.cacheService.getModel(field.targetModel)) {
          throw new NotFoundException(
            `Relation target model '${field.targetModel}' not found. Please define it first.`,
          );
        }
      }
      if (field.default !== undefined && !isValidDefaultValue(field.default, field.type)) {
        throw new BadRequestException(
          `Invalid or unsafe default value for field '${field.name}' of type '${field.type}'.`,
        );
      }
    }

    if (modelDefinition.ownerField) {
      if (!isValidIdentifier(modelDefinition.ownerField)) {
        throw new BadRequestException(
          `The ownerField name '${modelDefinition.ownerField}' is not valid. It must start with a letter or underscore and contain only letters, numbers, or underscores.`,
        );
      }

      const ownerFieldDef = modelDefinition.fields.find(
        (f) => f.name === modelDefinition.ownerField,
      );
      if (ownerFieldDef && ownerFieldDef.type !== 'number') {
        throw new BadRequestException(
          `The ownerField '${modelDefinition.ownerField}' must be of type 'number' (to store user IDs).`,
        );
      }
    }
  }
}