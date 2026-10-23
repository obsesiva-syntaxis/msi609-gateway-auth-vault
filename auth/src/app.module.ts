import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalSecretGuard } from './internal-secret.guard';
import { VaultService } from './vault.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, VaultService, InternalSecretGuard],
})
export class AppModule {}
