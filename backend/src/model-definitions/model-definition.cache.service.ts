// backend/src/model-definitions/model-definition.cache.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { ModelDefinition } from './model.types'; 

@Injectable()
export class ModelDefinitionCacheService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ModelDefinitionCacheService.name);
  private readonly modelsDir = path.join(process.cwd(), 'models');
  private cache = new Map<string, ModelDefinition>();
  private watcher: chokidar.FSWatcher;

  onModuleInit() {
    this.ensureModelsDirectory();
    this.loadAllModels();
    this.initializeWatcher();
  }

  onModuleDestroy() {
    this.watcher?.close();
    this.logger.log('File watcher closed.');
  }

  private ensureModelsDirectory() {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
      this.logger.warn(
        `'models' directory not found, created at: ${this.modelsDir}`,
      );
    }
  }

  private initializeWatcher() {
    this.watcher = chokidar.watch(path.join(this.modelsDir, '*.json'), {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.logger.log(`Watching for changes in: ${this.modelsDir}`);

    this.watcher
      .on('add', (filePath) => {
        const modelName = path.basename(filePath, '.json');
        this.logger.log(`File added: ${modelName}.json → reloading model...`);
        this.loadModel(modelName);
      })
      .on('change', (filePath) => {
        const modelName = path.basename(filePath, '.json');
        this.logger.log(`File changed: ${modelName}.json → reloading model...`);
        this.loadModel(modelName);
      })
      .on('unlink', (filePath) => {
        const modelName = path.basename(filePath, '.json');
        this.logger.log(
          `File removed: ${modelName}.json → removing from cache...`,
        );
        this.removeModel(modelName);
      })
      .on('error', (error) => {
        this.logger.error(`Watcher error: ${(error as any).message}`);
      });
  }

  private loadAllModels() {
    const files = fs
      .readdirSync(this.modelsDir)
      .filter((f) => f.endsWith('.json'));
    this.logger.log(`Found ${files.length} model definitions to cache.`);

    for (const file of files) {
      const modelName = path.basename(file, '.json');
      this.loadModel(modelName);
    }
  }

  loadModel(modelName: string): void {
    const filePath = path.join(this.modelsDir, `${modelName}.json`);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const modelDef = JSON.parse(content) as ModelDefinition;
      if (!modelDef.tableName) {
        modelDef.tableName = modelDef.name.toLowerCase();
      }
      this.cache.set(modelName, modelDef);
      this.logger.verbose(`Successfully loaded/reloaded model: ${modelName}`);
    } catch (error) {
      this.logger.error(
        `Failed to load or parse model: ${modelName}. Error: ${error.message}`,
      );
    }
  }

  removeModel(modelName: string): void {
    if (this.cache.delete(modelName)) {
      this.logger.log(`Removed model from cache: ${modelName}`);
    }
  }

  getModel(modelName: string): ModelDefinition {
    const modelDef = this.cache.get(modelName);
    if (!modelDef) {
      throw new NotFoundException(
        `Model definition for '${modelName}' not found or not cached.`,
      );
    }
    return modelDef;
  }

  listModels(): string[] {
    return Array.from(this.cache.keys());
  }

  getAllModelDefinitions(): ModelDefinition[] {
    return Array.from(this.cache.values());
  }
}