# Auth Example

Authentication with **`@bunary/auth`**: a JWT guard and an encrypted cookie session guard over one
user provider, on a `@bunary/http` router mounted on a `@bunary/core` Application.

Targets `@bunary/auth` **^0.5.0**, `@bunary/http` **^0.7.2** and `@bunary/core` **^0.4.0**
(Bun ≥ 1.4.0). Those three are the only dependencies.

## What it shows

- A **`UserProvider`** (`retrieveById` / `retrieveByCredentials` / `validateCredentials`) over an
  in-memory user list. Passwords are hashed with `Bun.password.hash` (argon2id) when the store is
  created and checked with `Bun.password.verify`; the plaintext is never stored, and the hash never
  leaves the store (the provider only hands out users without it).
- **JWT guard** (`createJwtGuard`): `POST /login` calls `attempt()`, which returns `{ user, token }`;
  `GET /me` with `Authorization: Bearer <token>` returns the user. A missing, expired, tampered or
  foreign-signed token gets 401.
- **Session guard** (`createSessionGuard`): `POST /session/login` sets the encrypted `bunary_session`
  cookie (HttpOnly, SameSite=Lax), `GET /session/me` reads it, `POST /session/logout` clears it.
  A modified, forged or expired cookie authenticates nobody.
- **`@bunary/core` integration** from `@bunary/auth/provider`: the `auth` config key, `authProvider`,
  `authMiddleware()` (the auth context on `ctx.locals.auth` for every route) and **`requireAuth()`**
  protecting a route group, with the user on **`ctx.locals.user`**.
- **Secrets from env** via `env()` from `@bunary/core`, with dev-only defaults (see below).

## Structure

```
src/
├── index.ts     # Entry point: demo users + secrets from env, boots and serves
├── app.ts       # createApp() with authProvider + httpProvider(router)
├── config.ts    # defineConfig(): app, http.port and the `auth` key (jwt + session guards)
├── router.ts    # Routes, authMiddleware() and requireAuth() groups
├── users.ts     # In-memory user store (argon2id hashes) and the UserProvider
└── secrets.ts   # JWT_SECRET / SESSION_SECRET via env(), dev defaults
```

## Pattern

```typescript
// config.ts: both guards share one provider
auth: {
  defaultGuard: "jwt",
  provider,
  guards: {
    jwt: createJwtGuard({ secret: secrets.jwtSecret, provider, mapUser: (p) => users.findById(Number(p.sub)) }),
    session: createSessionGuard({ provider, secret: secrets.sessionSecret, secure: isProd() }),
  },
},

// router.ts
router.use(authMiddleware<Locals>());               // ctx.locals.auth on every route

router.post("/login", async (ctx) => {
  const result = await ctx.locals.auth.attempt(await ctx.body.json(), "jwt");
  if (!result) return problem(401, "Invalid email or password");
  return { user: result.user, token: result.token };
});

router.group({ prefix: "/me", middleware: [requireAuth<Locals>({ guard: "jwt" })] }, (me) => {
  me.get("/", (ctx) => ({ user: ctx.locals.user })); // guests never get here: 401
});
```

## Running

```bash
bun install

bun run dev        # hot reload
bun run start      # or start normally

bun test           # tests
bun run typecheck  # tsc --noEmit
```

The server listens on port 3000 (set `PORT` to change it).

### Secrets

| Variable | Used by | Dev default |
|----------|---------|-------------|
| `JWT_SECRET` | JWT guard (HS256 signing/verification) | `DEV_JWT_SECRET` in `src/secrets.ts` |
| `SESSION_SECRET` | Session guard (cookie encryption); **exactly 32 bytes** | `DEV_SESSION_SECRET` in `src/secrets.ts` |

The dev defaults are public, so they are only used outside production: with `APP_ENV` (or
`NODE_ENV`) set to `production`, an unset variable makes startup throw. In production the session
cookie is also sent with `Secure`. Generate real secrets with, for example:

```bash
bun -e 'console.log(crypto.getRandomValues(new Uint8Array(32)).toBase64().slice(0, 32))'
```

### Demo users

`bun run dev` seeds two users (development data only, in `src/users.ts`):

| Email | Password |
|-------|----------|
| `ada@example.com` | `correct horse battery staple` |
| `alan@example.com` | `enigma-1912` |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Health check, lists the endpoints |
| POST | `/login` | — | JWT: `{ email, password }` → `{ user, token }`, or 401 |
| GET | `/me` | Bearer token | The token's user, or 401 |
| POST | `/session/login` | — | Session: `{ email, password }` → `{ user }` + session cookie, or 401 |
| GET | `/session/me` | Session cookie | The session's user, or 401 |
| POST | `/session/logout` | — | Clears the session cookie (204) |

401s are RFC 9457 problem responses (`application/problem+json`).

## Example Requests

```bash
# JWT: log in, then call /me with the token
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ada@example.com", "password": "correct horse battery staple"}' | jq -r .token)
curl http://localhost:3000/me -H "Authorization: Bearer $TOKEN"

# Session: log in with a cookie jar, read /session/me, log out
curl -c jar.txt -X POST http://localhost:3000/session/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ada@example.com", "password": "correct horse battery staple"}'
curl -b jar.txt http://localhost:3000/session/me
curl -b jar.txt -c jar.txt -X POST http://localhost:3000/session/logout
```

## Notes

- JWTs hold only `sub` (the user id) and expire after an hour. `logout` can't revoke a JWT; it stays
  valid until `exp`. Likewise a copied session cookie stays valid until its `exp` (two hours).
- The session lives entirely in the encrypted cookie; nothing is kept on the server.
