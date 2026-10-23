# api-gateway-auth-vault-nestjs

Laboratorio de seguridad de APIs: API Gateway, Auth Service, backend y HashiCorp Vault con NestJS y Docker Compose. Sesiones con cookie `HttpOnly`, introspección de tokens y autorización por roles.

> **Proyecto académico.** Los usuarios, contraseñas y secretos de este repositorio son datos de demostración. No usar en producción (ver [Limitaciones](#limitaciones)).

## Arquitectura

```
Navegador / Postman
        │  cookie de sesión (HttpOnly)
        ▼
 API Gateway :8000 ──── introspección ───▶ Auth Service :8100
   │   │                                         │
   │   └─── lee secretos ──▶ HashiCorp Vault :8200 ◀── lee secretos
   │
   └─── identidad confiable + secreto interno ───▶ Backend :9000
```

| Componente | Responsabilidad | No debe hacer |
|---|---|---|
| **API Gateway** | Validar sesión, autorizar por rol, enrutar y propagar identidad | Contener lógica de negocio |
| **Auth Service** | Verificar credenciales, emitir y revocar tokens, introspección | Ejecutar lógica de negocio |
| **Backend** | Lógica de negocio; exige el secreto del gateway y vuelve a validar el rol | Confiar en clientes externos |
| **Vault** | Guardar los secretos entre servicios | Autenticar usuarios finales |

Solo el gateway (`8000`) es público. El backend y el Auth Service no publican puertos hacia el equipo.

## Requisitos

- Docker y Docker Compose v2
- `curl` (para las pruebas de `up.sh`)
- Opcional: `jq` (para leer la auditoría de Vault) y Postman

## Inicio rápido

```bash
cp .env.example .env     # y completar los valores
./up.sh                  # construye, levanta todo y ejecuta las pruebas rápidas
./down.sh                # apaga y limpia
```

`up.sh` levanta Vault, carga los secretos con `vault-init`, arranca los servicios y ejecuta 19 comprobaciones. Todas deben salir `OK`.

## Usuarios de demostración

| Usuario | Contraseña | Roles |
|---|---|---|
| `ana` | `1234` | `user` |
| `ernesto` | `admin123` | `user`, `admin` |

## Endpoints del gateway

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `POST /auth/login` | Público | Inicia sesión y emite la cookie `session_token` |
| `GET /auth/me` | Sesión | Identidad y roles del usuario actual |
| `POST /auth/logout` | Sesión | Revoca la sesión en el servidor y elimina la cookie |
| `GET /api/products` | `user`, `admin` | Lista de productos |
| `GET /api/orders` | `user`, `admin` | Lista de órdenes |
| `DELETE /api/products/:id` | `admin` | Borra un producto (datos en memoria) |
| `GET /health` | Público | Estado del gateway |

Códigos: `401` = sin sesión válida; `403` = autenticado pero sin permiso; `502` = fallo del backend o de la comunicación interna; `503` = Vault o Auth Service no disponibles.

## Pruebas

| Prueba | Cómo ejecutarla | Qué cubre |
|---|---|---|
| Pruebas rápidas | `./up.sh` | 19 comprobaciones por el gateway, incluido el aislamiento de red |
| Auth Service directo | `docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d` y luego `./test-auth.sh` | 13 comprobaciones de login, introspección y logout |
| Colección Postman | Importar `postman/MSI609_v3_Solo_Gateway.postman_collection.json` y usar *Run collection* | 38 peticiones, solo por el puerto 8000 |

El archivo `docker-compose.debug.yml` publica temporalmente los puertos 8100 y 9000 en `127.0.0.1`. Para volver al modo normal, ejecuta `./up.sh`.

## Logs

```bash
docker compose logs -f --tail=20 gateway
docker compose logs -f --tail=20 auth
docker compose logs -f --tail=20 backend

# Auditoría de Vault, una línea por evento (requiere jq)
docker compose logs -f --no-log-prefix --tail=0 vault | jq -R -c 'fromjson? | select(.type=="response") | {time, op: .request.operation, path: .request.path, from: .request.remote_address}'
```

Los servicios registran solo método, ruta y código. Nunca registran cuerpos, cabeceras, contraseñas ni tokens.

## Decisiones de seguridad

- **Cookie `HttpOnly` + `SameSite=Lax`**: el token no es legible desde JavaScript y no viaja en el cuerpo de las respuestas.
- **Token opaco con introspección**: la revocación es inmediata (el logout invalida la sesión en el servidor).
- **Identidades separadas**: el cliente nunca conoce el secreto gateway→backend ni el de introspección.
- **Secretos en Vault**, no en el código; el Auth Service y el gateway los leen en tiempo de ejecución.
- **Autorización en dos capas**: el gateway valida el rol con la sesión y el backend lo vuelve a validar.
- **Lista blanca de rutas** en el gateway: lo que no está declarado responde 404.
- **Cabeceras de identidad nuevas**: el gateway ignora cualquier `X-Authenticated-*` enviado por el cliente.
- **Comparaciones en tiempo constante** (SHA-256 + `timingSafeEqual`) para secretos y tokens.
- **Contraseñas con `scrypt`** y sal aleatoria; se calcula el hash incluso si el usuario no existe.
- **Defensa contra CSRF**: `SameSite=Lax` más validación del header `Origin` en métodos que modifican estado.
- **Cabeceras HTTP**: CSP `default-src 'self'`, `nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`.
- **Logout que falla cerrado**: si no se puede revocar, responde 503 y no borra la cookie.

## Limitaciones

- HTTP plano (sin TLS/mTLS). En producción: HTTPS y cookie `Secure`.
- Vault en **modo dev**: en memoria, sin persistencia, y el gateway y el Auth Service usan el *root token*. En producción: AppRole y políticas de mínimo privilegio.
- Sesiones en memoria: reiniciar `auth` las pierde.
- Usuarios y contraseñas sembrados en el código del Auth Service.
- Introspección y lectura de Vault en cada petición, sin caché.
- Sin límite de intentos de login ni rate limiting.
- `scrypt` es aceptado por OWASP, pero Argon2id es su primera recomendación.
- Frontend: **pendiente** (el gateway sirve por ahora una página provisional).

## Estructura

```
.
├── auth/                  Auth Service (NestJS)
├── backend/               API de negocio (NestJS)
├── gateway/               API Gateway (NestJS) y carpeta public/ del frontend
├── postman/               Colecciones de Postman
├── docker-compose.yml
├── docker-compose.debug.yml
├── up.sh  down.sh  test-auth.sh
└── .env.example
```

## Referencias

- RFC 7662: OAuth 2.0 Token Introspection.
- RFC 6265: HTTP State Management Mechanism (cookies).
- OWASP Top 10 y OWASP Password Storage Cheat Sheet.

## Licencia

Pendiente de definir.
