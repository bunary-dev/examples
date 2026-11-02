# Bunary Examples

Example projects and tutorials for the Bunary framework.

## Examples

| Example | Description |
|---------|-------------|
| [basic-api](./basic-api) | Core features: routes, params, middleware, JSON responses, core app + config (`@bunary/core`/`@bunary/http` ^0.4.0) |
| [nested-routes](./nested-routes) | Nested route groups, named routes and `basePath` with `createRouter` (`@bunary/core` / `@bunary/http` ^0.4.0) |
| [basic-orm](./basic-orm) | `@bunary/orm` 0.4 models on Drizzle: `defineModel`, CRUD with dirty tracking, scopes, soft deletes, relations, drizzle-kit migrations |
| [auth](./auth) | `@bunary/auth` 0.4: user provider with `Bun.password` hashes, JWT guard (`/login`, `/me`), encrypted session cookie guard, `requireAuth()` route groups, secrets from `env()` (`@bunary/auth`/`@bunary/http`/`@bunary/core` ^0.4.0) |

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
