import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Put,
  Req,
  Query,
} from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RbacGuard } from 'src/auth/rbac.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api')
export class DynamicApiController {
  constructor(private readonly dynamicApiService: DynamicApiService) {}

  @Post(':modelName')
  create(
    @Param('modelName') modelName: string,
    @Body() createDto: Record<string, any>,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: number; role: string };
    return this.dynamicApiService.create(modelName, createDto, user.sub);
  }

  @Get(':modelName')
  findAll(
    @Param('modelName') modelName: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    return this.dynamicApiService.findAll(modelName, { page, limit, search });
  }

  @Get(':modelName/:id')
  findOne(
    @Param('modelName') modelName: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dynamicApiService.findOne(modelName, id);
  }

  @Put(':modelName/:id')
  update(
    @Param('modelName') modelName: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Record<string, any>,
  ) {
    return this.dynamicApiService.update(modelName, id, updateDto);
  }

  @Delete(':modelName/:id')
  delete(
    @Param('modelName') modelName: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dynamicApiService.delete(modelName, id);
  }
}