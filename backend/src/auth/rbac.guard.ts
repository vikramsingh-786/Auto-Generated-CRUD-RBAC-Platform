import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ModelDefinitionCacheService } from '../model-definitions/model-definition.cache.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { DynamicApiService } from 'src/dynamic-api/dynamic-api.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly cacheService: ModelDefinitionCacheService,
    private readonly dynamicApiService: DynamicApiService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role || !user.sub) {
      throw new ForbiddenException('User authentication information missing.');
    }

    const { method, params } = request;
    const modelName = params.modelName;
    const recordId = params.id ? parseInt(params.id, 10) : null;

    if (!modelName) {
      return true;
    }

    let requiredPermission: string;
    switch (method) {
      case 'POST': requiredPermission = 'create'; break;
      case 'GET': requiredPermission = 'read'; break;
      case 'PUT':
      case 'PATCH': requiredPermission = 'update'; break;
      case 'DELETE': requiredPermission = 'delete'; break;
      default: return true;
    }

    const modelDef = this.cacheService.getModel(modelName);
    const userRole = user.role;
    const rolePermissions: string[] = modelDef.rbac?.[userRole] || [];

    const hasRolePermission =
      rolePermissions.includes(requiredPermission) ||
      rolePermissions.includes('all');

    if (!hasRolePermission) {
      throw new ForbiddenException(
        `Your role ('${userRole}') does not have the '${requiredPermission}' permission for '${modelName}'.`,
      );
    }
    if (
      (requiredPermission === 'update' || requiredPermission === 'delete') &&
      modelDef.ownerField &&
      user.role !== 'Admin' 
    ) {
      if (!recordId) {
        throw new BadRequestException(
          'An ID is required to perform an update or delete operation.',
        );
      }

      const record = await this.dynamicApiService.findOne(
        modelName,
        recordId,
      );

      const ownerValue = record[modelDef.ownerField];
      
      if (ownerValue !== user.sub) {
        throw new ForbiddenException(
          `You do not have permission to modify this record because you are not the owner.`,
        );
      }
    }
    return true; 
  }
}