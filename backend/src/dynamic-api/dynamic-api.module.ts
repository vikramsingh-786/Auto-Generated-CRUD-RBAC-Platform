// backend/src/dynamic-api/dynamic-api.module.ts
import { Module, Global } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { DynamicApiController } from './dynamic-api.controller';
import { ModelDefinitionsModule } from '../model-definitions/model-definitions.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
@Global()
@Module({
  imports: [
    PrismaModule,
    ModelDefinitionsModule, 
    AuthModule,            
  ],
  controllers: [DynamicApiController],
  providers: [DynamicApiService],
  exports: [DynamicApiService], 
})
export class DynamicApiModule {}
