# Full App Example

One application wired through `@bunary/core` providers: `@bunary/http`, `@bunary/orm` and
`@bunary/auth` working together in a small notes API. Users register and log in with a JWT, then
create, list, update and delete their own notes, stored in SQLite through Drizzle.

The single-package examples (`basic-api`, `basic-orm`, `auth`) each show one package. This one shows
how they fit together.

## Versions

| Package | Version |
| --- | --- |
| `@bunary/core` | `^0.4.0` |
| `@bunary/http` | `^0.7.2` |
| `@bunary/orm` | `^0.4.0` |
| `@bunary/auth` | `^0.5.0` |
| `drizzle-orm` | `^0.45.0` (peer dependency of the orm) |
| `drizzle-kit` | `^0.31.0` (dev, migrations) |

Requires Bun ≥ 1.4.0.

## Quick start

```bash
bun install
bun run dev        # migrates full-app.sqlite (db:setup), then serves on :3000 with --hot
```

## Scripts

| Script | Does |
| --- | --- |
| `bun run dev` | `db:setup`, then serve with `--hot` |
| `bun run start` | Serve (run `db:setup` first) |
| `bun run db:setup` | Apply the pending drizzle-kit migrations in `drizzle/` to `DATABASE_PATH`; existing data is kept |
| `bun run db:generate` | Write a new SQL migration in `drizzle/` after you change `src/db/schema.ts` (drizzle-kit) |
| `bun test` | Run the tests (each boots the app against a migrated temp SQLite file, deleted afterwards) |
| `bun run typecheck` | `tsc --noEmit` |

## Environment

Read with `env()` from `@bunary/core` (`src/config.ts`):

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | |
| `DATABASE_PATH` | `./full-app.sqlite` | git-ignored; also used by `db:setup` and drizzle-kit |
| `JWT_SECRET` | a dev-only secret | **required in production**: with `APP_ENV`/`NODE_ENV=production` an unset `JWT_SECRET` throws at startup, because the dev default is public |

## API

| Route | Auth | Body | Answers |
| --- | --- | --- | --- |
| `GET /` | | | the endpoint list |
| `POST /register` | | `{ name, email, password }` (password ≥ 8 chars) | `201 { user }`; `409` for a taken email |
| `POST /login` | | `{ email, password }` | `{ user, token }`; `401` for wrong credentials |
| `GET /me` | JWT | | `{ user }` |
| `GET /notes` | JWT | | `{ notes }`, your own only |
| `POST /notes` | JWT | `{ title, body? }` | `201 { note }` |
| `GET /notes/:id` | JWT | | `{ note }` |
| `PATCH /notes/:id` | JWT | `{ title?, body? }` (at least one) | `{ note }` |
| `DELETE /notes/:id` | JWT | | `204`; the note is soft-deleted |

- Without a valid `Authorization: Bearer <token>`, every JWT route answers `401` (an RFC 9457
  problem document). So does a valid token whose user no longer exists.
- Someone else's note gets `404`, the same as one that doesn't exist, as does a deleted note.
- Invalid input gets `422` with every issue listed in `errors`.
- No response ever contains a password or its hash: the `password` column is `hidden` on the model.

### Walkthrough

```bash
curl -X POST localhost:3000/register -H "Content-Type: application/json" \
  -d '{"name": "Ada Lovelace", "email": "ada@example.com", "password": "<a password>"}'

curl -X POST localhost:3000/login -H "Content-Type: application/json" \
  -d '{"email": "ada@example.com", "password": "<that password>"}'
# → { "user": { ... }, "token": "<token>" }

TOKEN=<token>
curl -X POST localhost:3000/notes -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title": "Groceries", "body": "eggs"}'
curl localhost:3000/notes -H "Authorization: Bearer $TOKEN"
curl -X PATCH localhost:3000/notes/1 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"body": "eggs, milk"}'
curl -X DELETE localhost:3000/notes/1 -H "Authorization: Bearer $TOKEN"
```

## How the providers fit together

```typescript
// src/app.ts
const users = createUserProvider(() => app.get(ModelsToken));
const app = createApp({
  config: buildConfig(options, users), // defineConfig({ app, http, database, auth })
  providers: [ormProvider({ schema }), modelsProvider, authProvider, httpProvider(router)],
});
await app.boot();
```

| Provider | Reads | Binds | From |
| --- | --- | --- | --- |
| `ormProvider({ schema })` | `database` config key | the Drizzle database (`drizzle-orm/bun-sqlite`) under `DatabaseToken` | `@bunary/orm/provider` |
| `modelsProvider` | `DatabaseToken` | the `User` and `Note` models under `ModelsToken` | this example (`src/models.ts`, `defineProvider`) |
| `authProvider` | `auth` config key | the auth manager (JWT guard + user provider) under `AuthToken` | `@bunary/auth/provider` |
| `httpProvider(router)` | `http` config key | the router under `RouterToken` | `@bunary/http/provider` |

- **Order is the array.** Core runs every provider's `register()` in declaration order, then every
  `boot()`. `ormProvider` binds the database in `register()`, so `modelsProvider`, listed after it,
  can build the models from `DatabaseToken` in its own `register()`.
- **One container.** Nothing is global: each `createFullApp()` has its own database, models and auth
  manager. The tests boot a fresh app per test against a temp database.
- **Handlers resolve from the app.** `httpProvider` sets `ctx.app` on every request, so handlers read
  the models with `ctx.app.get(ModelsToken)`, and `authMiddleware()` / `requireAuth()` find the
  auth manager under `AuthToken`.
- **Auth meets the orm structurally.** auth's `UserProvider` is an interface with three methods.
  `src/users.ts` implements it over the `User` model (`find`, `where(eq(users.email, …)).first()`,
  `Bun.password.verify`) with no adapter package, and neither package imports the other. The provider
  belongs to the `auth` config, which exists before the app registers its models, so it takes a
  function that resolves the models from the app when a request needs them.
- **What the guard knows.** The JWT holds only `sub`. The guard's async `mapUser` (auth ≥ 0.5)
  loads that user through the user provider on every request, so `ctx.locals.user` is the user's
  `toJSON()` snapshot, and a valid, unexpired token for a user who has since been deleted gets
  `401`, as does one whose lookup fails. The user provider returns `toJSON()`
  snapshots, so the user that `attempt()` returns, and that `/login` sends, has no password either.

## Request validation and CORS

- Routes declare validators in an options object: `router.post("/notes", { body: createNoteBody },
  handler)`. Inside the handler, `ctx.body` / `ctx.params` hold the validated, typed values.
  `src/validation.ts` uses plain functions that throw core's `ValidationError`, so the example needs
  no validation library. A Standard Schema validator such as zod works the same way.
- `router.use(cors())` comes first, so preflights and every response (401s included) carry the CORS
  headers.

## What it shows

| Feature | Where |
| --- | --- |
| `createApp({ config, providers })`, resolving `RouterToken`, `DatabaseToken`, `AuthToken` | `src/app.ts`, `tests/app.test.ts` |
| `defineConfig({ app, http, database, auth })`, `env()`, a secret production refuses to default | `src/config.ts` |
| Drizzle tables, drizzle-kit migrations applied by `db:setup` | `src/db/schema.ts`, `drizzle/`, `src/db/setup.ts` |
| `defineModel()`: `hidden: ["password"]`, a `creating` event that hashes it, `softDeletes: true` | `src/models.ts` |
| A custom provider with `defineProvider()` and `createToken()` | `src/models.ts` |
| A `UserProvider` over the orm model, the JWT guard, `attempt()` | `src/users.ts`, `src/config.ts` |
| `authMiddleware()`, `requireAuth()` groups, per-user queries | `src/router.ts` |
| Route validation (`params`, `body`) → 422, `cors()`, `problem()` | `src/router.ts`, `src/validation.ts` |
| Soft-deleted notes still found by `Note.withTrashed()` | `tests/api.test.ts` |

## Project structure

```
full-app/
├── drizzle.config.ts      # drizzle-kit config
├── drizzle/               # generated SQL migrations (committed)
├── src/
│   ├── db/
│   │   ├── schema.ts      # Drizzle tables and relations
│   │   ├── database.ts    # AppDatabase type, migrateDatabase()
│   │   └── setup.ts       # bun run db:setup
│   ├── models.ts          # User and Note models, modelsProvider, ModelsToken
│   ├── users.ts           # UserProvider over the User model
│   ├── config.ts          # env() options and defineConfig()
│   ├── validation.ts      # route validators
│   ├── router.ts          # the notes API
│   ├── app.ts             # createApp + providers
│   └── index.ts           # serve it
└── tests/                 # bun test
```

## Changing the schema

1. Edit `src/db/schema.ts`.
2. `bun run db:generate` to write the migration into `drizzle/`.
3. `bun run db:setup` (or `bun run dev`) to apply it.

## Related documentation

- [@bunary/core](https://github.com/bunary-dev/core/blob/main/docs/index.md)
- [@bunary/http](https://github.com/bunary-dev/http/blob/main/docs/index.md)
- [@bunary/orm](https://github.com/bunary-dev/orm/blob/main/docs/index.md)
- [@bunary/auth](https://github.com/bunary-dev/auth/blob/main/docs/index.md)
