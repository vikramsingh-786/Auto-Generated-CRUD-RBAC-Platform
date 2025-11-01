import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ModelDefinitionCacheService } from '../model-definitions/model-definition.cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ModelDefinition,
  FieldDefinition,
} from '../model-definitions/model.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class DynamicApiService {
  private readonly logger = new Logger(DynamicApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ModelDefinitionCacheService,
  ) {}

  private getModel(modelName: string): ModelDefinition {
    const model = this.cacheService.getModel(modelName);
    if (!model) {
      throw new NotFoundException(
        `Model definition for '${modelName}' not found.`,
      );
    }
    return model;
  }

  private validateAndSanitizeData(
    data: Record<string, any>,
    fields: FieldDefinition[],
  ): Record<string, any> {
    const sanitizedData: Record<string, any> = {};
    for (const field of fields) {
      const key = field.name;
      if (data.hasOwnProperty(key)) {
        const value = data[key];

        if (value === null || value === undefined || value === '') {
          continue;
        }

        if (field.type === 'number' || field.type === 'relation') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            continue;
          }
          sanitizedData[key] = numValue;
        } else if (field.type === 'boolean') {
          sanitizedData[key] = Boolean(value);
        } else {
          sanitizedData[key] = value;
        }
      }
    }
    return sanitizedData;
  }

  async create(modelName: string, data: Record<string, any>, ownerId?: number) {
    console.log('OWNER ID RECEIVED BY SERVICE:', ownerId); 
    const model = this.getModel(modelName);
    const tableName = model.tableName || model.name.toLowerCase();
    const sanitizedData = this.validateAndSanitizeData(data, model.fields);

    if (model.ownerField && ownerId !== undefined) {
      sanitizedData[model.ownerField] = ownerId;
    }

    if (Object.keys(sanitizedData).length === 0) {
      throw new BadRequestException('Cannot create record with empty data.');
    }

    const table = Prisma.raw(tableName);
    const columns = Prisma.join(
      Object.keys(sanitizedData).map((k) => Prisma.raw(`"${k}"`)),
    );
    const values = Prisma.join(Object.values(sanitizedData));

    const query = Prisma.sql`INSERT INTO ${table} (${columns}) VALUES (${values}) RETURNING *;`;

    try {
      const result = await this.prisma.$queryRaw(query);
      return (result as any[])[0] || null;
    } catch (e: any) {
      throw new BadRequestException(
        e.message.split('ERROR: ').pop()?.split('\n')[0] || e.message,
      );
    }
  }

  async findAll(
    modelName: string,
    options: { page?: string; limit?: string; search?: string },
  ) {
    const model = this.getModel(modelName);
    const tableName = model.tableName || model.name.toLowerCase();
    const table = Prisma.raw(tableName);

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const offset = (page - 1) * limit;

    const search = options.search?.trim() || '';
    let whereClause = Prisma.sql``; 

    if (search) {
      const searchableFields = model.fields.filter(
        (field) => field.type === 'string' || field.type === 'number',
      );

      if (searchableFields.length > 0) {
        const conditions = searchableFields.map((field) => {
          if (field.type === 'number') {
            return Prisma.sql`"${Prisma.raw(field.name)}"::text ILIKE ${'%' + search + '%'}`;
          }
          return Prisma.sql`"${Prisma.raw(field.name)}" ILIKE ${'%' + search + '%'}`;
        });

        whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' OR ')}`;
      }
    }

    const dataQuery = Prisma.sql`SELECT * FROM ${table} ${whereClause} ORDER BY "id" DESC LIMIT ${limit} OFFSET ${offset};`;
    const countQuery = Prisma.sql`SELECT COUNT(*) FROM ${table} ${whereClause};`;

    try {
      const [data, countResult] = await this.prisma.$transaction([
        this.prisma.$queryRaw(dataQuery),
        this.prisma.$queryRaw(countQuery),
      ]);

      const total = Number((countResult as any)[0].count);

      return { data, total };
      
    } catch (e: any) {
      this.logger.error(`Failed to find all records for ${modelName}.`, e.stack);
      throw new BadRequestException(
        e.message.split('ERROR: ').pop()?.split('\n')[0] || e.message,
      );
    }
  }

  async findOne(modelName: string, id: number) {
    const model = this.getModel(modelName);
    const tableName = model.tableName || model.name.toLowerCase();
    const table = Prisma.raw(tableName);

    const query = Prisma.sql`SELECT * FROM ${table} WHERE "id" = ${id};`;
    const result: any[] = await this.prisma.$queryRaw(query);

    if (!result || result.length === 0) {
      throw new NotFoundException(
        `Record with ID ${id} not found in ${modelName}.`,
      );
    }
    return result[0];
  }

  async update(modelName: string, id: number, data: Record<string, any>) {
    const model = this.getModel(modelName);
    const tableName = model.tableName || model.name.toLowerCase();
    const table = Prisma.raw(tableName);

    const sanitizedData = this.validateAndSanitizeData(data, model.fields);
    sanitizedData['updatedAt'] = new Date();

    if (Object.keys(sanitizedData).length <= 1) {
      throw new BadRequestException('No valid fields provided for update.');
    }

    const setClauses = Prisma.join(
      Object.entries(sanitizedData).map(
        ([key, value]) => Prisma.sql`"${Prisma.raw(key)}" = ${value}`,
      ),
    );

    const query = Prisma.sql`UPDATE ${table} SET ${setClauses} WHERE "id" = ${id} RETURNING *;`;

    try {
      const result = await this.prisma.$queryRaw(query);
      if (!result || (result as any[]).length === 0) {
        throw new NotFoundException(
          `Record with ID ${id} not found in ${modelName} to update.`,
        );
      }
      return (result as any[])[0];
    } catch (e: any) {
      throw new BadRequestException(
        e.message.split('ERROR: ').pop()?.split('\n')[0] || e.message,
      );
    }
  }

  async delete(modelName: string, id: number) {
    const model = this.getModel(modelName);
    const tableName = model.tableName || model.name.toLowerCase();
    const table = Prisma.raw(tableName);

    await this.findOne(modelName, id);

    const query = Prisma.sql`DELETE FROM ${table} WHERE "id" = ${id} RETURNING "id";`;
    await this.prisma.$queryRaw(query);
    return { message: `Record ${id} from ${modelName} deleted successfully.` };
  }
}