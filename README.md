# Bunary Examples

Example projects and tutorials for the Bunary framework.

## Examples

| Example | Description |
|---------|-------------|
| [basic-api](./basic-api) | Core features: routes, params, middleware, JSON responses, core app + config (`@bunary/core`/`@bunary/http` ^0.4.0) |
| [nested-routes](./nested-routes) | Nested route groups, named routes, `basePath` and thrown `NotFoundError` 404s with `createRouter` (`@bunary/core` / `@bunary/http` ^0.4.0) |
| [basic-orm](./basic-orm) | `@bunary/orm` 0.4 models on Drizzle: `defineModel`, CRUD with dirty tracking, scopes, soft deletes, relations, drizzle-kit migrations |
| [auth](./auth) | `@bunary/auth` 0.4: user provider with `Bun.password` hashes, JWT guard (`/login`, `/me`), encrypted session cookie guard, `requireAuth()` route groups, secrets from `env()` (`@bunary/auth`/`@bunary/http`/`@bunary/core` ^0.4.0) |
| [realtime](./realtime) | `@bunary/http` 0.4 realtime: a WebSocket chat on `router.ws()` (rooms, params in `ws.data`, token middleware rejecting the upgrade with 401) and Server-Sent Events with `sse()` (`@bunary/http`/`@bunary/core` ^0.4.0) |
| [full-app](./full-app) | One app wired through `@bunary/core` providers: `httpProvider` + `ormProvider` (SQLite, drizzle-kit migrations) + `authProvider` in a notes API with register/login (JWT), per-user notes on a `defineModel` model with soft deletes and a hidden password, a `UserProvider` over the orm model, route validation and `cors()` (`@bunary/core`/`http`/`orm`/`auth` ^0.4.0) |

## Running Examples

```bash
cd <example-folder>
bun install
bun run dev
```

Each example has its own tests:

```bash
cd <example-folder>
bun test
```

`basic-orm` creates its SQLite database from drizzle-kit migrations (`bun run db:setup`; `dev`/`start` do it too).
See [basic-orm/README.md](./basic-orm/README.md).

`auth` reads `JWT_SECRET` and `SESSION_SECRET` from the environment, with dev-only defaults that
production refuses. See [auth/README.md](./auth/README.md).

`realtime` needs a chat token (`CHAT_TOKEN`, dev-only default outside production) to open a WebSocket.
See [realtime/README.md](./realtime/README.md).

`full-app` migrates its SQLite database with `bun run db:setup` (`dev` does it first) and reads
`JWT_SECRET` from the environment (dev-only default outside production).
See [full-app/README.md](./full-app/README.md).
