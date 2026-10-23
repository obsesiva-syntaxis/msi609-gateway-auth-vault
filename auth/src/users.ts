import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64;

export interface StoredUser {
  userId: string;
  username: string;
  roles: string[];
  salt: Buffer;
  hash: Buffer;
}

// SOLO LABORATORIO: en un sistema real los usuarios viven en una base de datos
const SEED = [
  { userId: 'USR-001', username: 'ana', password: '1234', roles: ['user'] },
  { userId: 'USR-003', username: 'ernesto', password: 'admin123', roles: ['user', 'admin'] },
];

const USERS = new Map<string, StoredUser>();
for (const u of SEED) {
  const salt = randomBytes(16);
  USERS.set(u.username, {
    userId: u.userId,
    username: u.username,
    roles: u.roles,
    salt,
    hash: scryptSync(u.password, salt, KEYLEN),
  });
}

// Hash de relleno: se calcula tambien cuando el usuario no existe,
// para que el tiempo de respuesta no revele si el usuario esta registrado.
const DUMMY_SALT = randomBytes(16);
const DUMMY_HASH = scryptSync('relleno', DUMMY_SALT, KEYLEN);

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export function findUser(username: string): StoredUser | undefined {
  return USERS.get(username);
}

export async function verifyPassword(
  user: StoredUser | undefined,
  password: string,
): Promise<boolean> {
  const salt = user ? user.salt : DUMMY_SALT;
  const expected = user ? user.hash : DUMMY_HASH;
  const candidate = await scryptAsync(password, salt);
  return timingSafeEqual(candidate, expected) && user !== undefined;
}
