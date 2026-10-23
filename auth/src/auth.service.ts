import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { findUser, verifyPassword } from './users';

interface Session {
  userId: string;
  username: string;
  roles: string[];
  expiresAt: number;
}

const TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? 900);

// Las sesiones se indexan por el SHA-256 del token:
// un volcado de memoria no expone tokens vivos.
const keyOf = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, Session>();

  async login(username: string, password: string) {
    const user = findUser(username);
    const ok = await verifyPassword(user, password);
    if (!user || !ok) return null;

    this.purgeExpired();
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(keyOf(token), {
      userId: user.userId,
      username: user.username,
      roles: user.roles,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    });
    return { access_token: token, token_type: 'bearer', expires_in: TTL_SECONDS };
  }

  introspect(token: string) {
    const key = keyOf(token);
    const session = this.sessions.get(key);
    if (!session) return { active: false };
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(key);
      return { active: false };
    }
    return {
      active: true,
      user_id: session.userId,
      username: session.username,
      roles: session.roles,
    };
  }

  logout(token: string): boolean {
    return this.sessions.delete(keyOf(token));
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [key, s] of this.sessions) {
      if (s.expiresAt <= now) this.sessions.delete(key);
    }
  }
}
