import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class VaultService {
  private readonly addr = process.env.VAULT_ADDR ?? 'http://vault:8200';
  private readonly token = process.env.VAULT_TOKEN ?? '';

  async getSecret(key: string): Promise<string> {
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
    const value = json.data.data[key];
    if (typeof value !== 'string') {
      throw new ServiceUnavailableException('Secreto no disponible');
    }
    return value;
  }
}
