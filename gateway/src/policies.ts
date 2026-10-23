// Lista blanca de rutas expuestas por el gateway y roles que pueden usarlas.
// Lo que no esta aqui no se enruta (404).
interface Policy {
  method: string;
  pattern: RegExp;
  roles: string[];
}

const POLICIES: Policy[] = [
  { method: 'GET', pattern: /^products\/?$/, roles: ['user', 'admin'] },
  { method: 'GET', pattern: /^orders\/?$/, roles: ['user', 'admin'] },
  { method: 'DELETE', pattern: /^products\/\d+$/, roles: ['admin'] },
];

export function findPolicy(method: string, path: string): Policy | undefined {
  return POLICIES.find((p) => p.method === method && p.pattern.test(path));
}
