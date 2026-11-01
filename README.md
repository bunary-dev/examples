# Bunary Examples

Example projects and tutorials for the Bunary framework.

## Examples

| Example | Description |
|---------|-------------|
| [basic-api](./basic-api) | Core features: routes, params, middleware, JSON responses |
| [nested-routes](./nested-routes) | Organizing routes into separate modules with prefixes |
| [basic-orm](./basic-orm) | `@bunary/orm` 0.4 models on Drizzle: `defineModel`, CRUD with dirty tracking, scopes, soft deletes, relations, drizzle-kit migrations |

## Running Examples

```bash
cd <example-folder>
bun install
bun run dev
```

`basic-orm` creates its SQLite database from drizzle-kit migrations (`bun run db:setup`; `dev`/`start` do it too).
See [basic-orm/README.md](./basic-orm/README.md).
