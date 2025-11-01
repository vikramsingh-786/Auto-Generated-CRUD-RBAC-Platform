import { SetMetadata } from '@nestjs/common';

export const AllowAnyRole = () => SetMetadata(AllowAnyRole.name, true);