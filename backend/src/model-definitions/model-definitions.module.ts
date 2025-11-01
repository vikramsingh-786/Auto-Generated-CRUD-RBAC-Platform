// backend/src/model-definitions/model-definitions.module.ts
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RbacGuard } from 'src/auth/rbac.guard';
import { ModelDefinitionsController } from './model-definitions.controller';
import { ModelDefinitionsService } from './model-definitions.service';
import { ModelDefinitionCacheService } from './model-definition.cache.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [ModelDefinitionsController],
  providers: [
    ModelDefinitionsService,
    ModelDefinitionCacheService,
    JwtAuthGuard,
    RbacGuard,
  ],
  exports: [
    ModelDefinitionsService,         
    ModelDefinitionCacheService,     
  ],
})
export class ModelDefinitionsModule {}
