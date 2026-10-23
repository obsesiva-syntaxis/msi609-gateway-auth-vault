import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface GatewaySecrets {
  backend_shared_secret: string;
  auth_introspection_secret: string;
}

@Injectable()
export class VaultService {
  private readonly addr = process.env.VAULT_ADDR ?? 'http://vault:8200';
  private readonly token = process.env.VAULT_TOKEN ?? '';

  async getGatewaySecrets(): Promise<GatewaySecrets> {
    let res: Response;
    try {
      res = await fetch(`${this.addr}/v1/secret/data/gateway`, {
        headers: { 'X-Vault-Token': this.token },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('Vault no disponible');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException('No fue posible acceder a Vault');
    }
    const json = (await res.json()) as { data: { data: Record<string, unknown> } };
    const d = json.data.data;
    if (
      typeof d.backend_shared_secret !== 'string' ||
      typeof d.auth_introspection_secret !== 'string'
    ) {
      throw new ServiceUnavailableException('Secretos incompletos en Vault');
    }
    return {
      backend_shared_secret: d.backend_shared_secret,
      auth_introspection_secret: d.auth_introspection_secret,
    };
  }
}
