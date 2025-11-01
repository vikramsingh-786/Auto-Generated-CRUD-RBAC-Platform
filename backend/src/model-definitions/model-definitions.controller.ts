import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Delete,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ModelDefinitionCacheService } from './model-definition.cache.service';
import { ModelDefinitionsService } from './model-definitions.service';
import type { ModelDefinition } from './model.types'; 

@UseGuards(JwtAuthGuard)
@Controller('model-definitions')
export class ModelDefinitionsController {
  constructor(
    private readonly modelDefinitionsService: ModelDefinitionsService,
    private readonly cacheService: ModelDefinitionCacheService,
  ) {}

  @Get('list')
  listModels(): string[] {
    return this.cacheService.listModels();
  }

  @Get()
  getAllModelDefinitions(): ModelDefinition[] {
    return this.cacheService.getAllModelDefinitions();
  }

  @Get(':modelName')
  getModelDefinition(@Param('modelName') modelName: string): ModelDefinition {
    return this.cacheService.getModel(modelName);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publishModel(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    modelDefinition: ModelDefinition, // This line will no longer error
  ): Promise<{ message: string; changes?: string[] }> {
    return this.modelDefinitionsService.publishModel(modelDefinition);
  }

  @Delete(':modelName')
  @HttpCode(HttpStatus.OK)
  async deleteModel(
    @Param('modelName') modelName: string,
  ): Promise<{ message: string }> {
    return this.modelDefinitionsService.deleteModel(modelName);
  }
}