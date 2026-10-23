import { Module } from '@nestjs/common';
import { AuthClient } from './auth-client.service';
import { AuthController } from './auth.controller';
import { ProxyController } from './proxy.controller';
import { SessionGuard } from './session.guard';
import { VaultService } from './vault.service';

@Module({
  controllers: [AuthController, ProxyController],
  providers: [VaultService, AuthClient, SessionGuard],
})
export class AppModule {}
