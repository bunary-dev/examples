# Bunary Examples

Example projects and tutorials for the Bunary framework.

## Examples

| Example | Description |
|---------|-------------|
| [basic-api](./basic-api) | Core features: routes, params, middleware, JSON responses, core app + config (`@bunary/core`/`@bunary/http` ^0.4.0) |
| [nested-routes](./nested-routes) | Organizing routes into separate modules with prefixes |
| [basic-orm](./basic-orm) | ORM usage: database queries, Model API, query builder methods |

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
