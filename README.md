# Bunary Examples

Example projects and tutorials for the Bunary framework.

## Examples

| Example | Description |
|---------|-------------|
| [basic-api](./basic-api) | Core features: routes, params, middleware, JSON responses, core app + config (`@bunary/core` ^0.4.0 / `@bunary/http` ^0.7.2) |
| [nested-routes](./nested-routes) | Nested route groups, named routes, `basePath`, route model binding (`bind` / `ctx.bound`, scoped to a parent record) and problem+json 404s with `createRouter` (`@bunary/core` ^0.4.0 / `@bunary/http` ^0.7.2) |
| [basic-orm](./basic-orm) | `@bunary/orm` 0.4 models on Drizzle: `defineModel`, CRUD with dirty tracking, scopes, soft deletes, relations, drizzle-kit migrations |
| [auth](./auth) | `@bunary/auth` 0.5: user provider with `Bun.password` hashes, JWT guard (`/login`, `/me`), encrypted session cookie guard, `requireAuth()` route groups, secrets from `env()` (`@bunary/auth` ^0.5.0, `@bunary/http` ^0.7.2, `@bunary/core` ^0.4.0) |
| [realtime](./realtime) | `@bunary/http` realtime: a WebSocket chat on `router.ws()` (rooms, params in `ws.data`, token middleware rejecting the upgrade with 401) and Server-Sent Events with `sse()` (`@bunary/http` ^0.7.2, `@bunary/core` ^0.4.0) |
| [full-app](./full-app) | One app wired through `@bunary/core` providers: `httpProvider` + `ormProvider` (SQLite, drizzle-kit migrations) + `authProvider` in a notes API with register/login (JWT), per-user notes on a `defineModel` model with soft deletes and a hidden password, a `UserProvider` over the orm model (an async `mapUser` checks every JWT user still exists), route validation and `cors()` (`@bunary/core`/`orm` ^0.4.0, `http` ^0.7.2, `auth` ^0.5.0) |
| [cli-commands](./cli-commands) | A custom project command, `bunary hello [name] [--utc]`: scaffolded with `make:command`, registered in `config/bunary.ts` with `defineConfig({ commands })`, run with `bunx bunary hello`; greeting with the date and time via `Intl.DateTimeFormat` (`@bunary/core` ^0.4.0, `@bunary/cli` ^0.4.6) |

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

`cli-commands` has no server: run its command with `bunx bunary hello` instead of `bun run dev`.
See [cli-commands/README.md](./cli-commands/README.md).
