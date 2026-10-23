import { applyDecorators, UseGuards } from '@nestjs/common';
import { GatewaySecretGuard } from './gateway-secret.guard';
import { IdentityGuard } from './identity.guard';
import { RolesGuard } from './roles.guard';

// Orden: 1) el secreto del gateway, 2) la identidad propagada, 3) el rol.
export const Protected = () =>
  applyDecorators(UseGuards(GatewaySecretGuard, IdentityGuard, RolesGuard));
