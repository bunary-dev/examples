# Nested Routes Example

Organizes an API into **nested route groups** with **named routes**, mounted on a
`@bunary/core` Application.

Targets `@bunary/core` **^0.4.0** and `@bunary/http` **^0.4.0** (Bun ≥ 1.4.0).

## What it shows

- `createRouter()` from `@bunary/http`, with optional `basePath`
- Route groups (`router.group({ prefix, name }, cb)`), nested two levels deep
- Named routes (`.name()`) whose names stack with each group's name prefix, and URL
  generation with `router.route(name, params)`
- Thrown `NotFoundError`s, rendered by the router as `application/problem+json`
- `createApp()` from `@bunary/core`, with the router mounted by `httpProvider()` and
  started by `serve()` from `@bunary/http/provider`

## Structure

```
bunary.config.ts          # App config (name, http.port)
src/
├── index.ts              # Entry point - boots the app and serves it
├── app.ts                # createApp() + httpProvider(router)
├── router.ts             # createRouter(), health route, /api group
├── data.ts               # In-memory store (one per router)
└── routes/
    ├── users.ts          # /users group + nested /:userId/posts group
    └── posts.ts          # /posts group
```

## Pattern

Each module registers its own group inside the group it is given:

```typescript
export function registerUserRoutes(api: GroupRouter, store: Store): void {
  api.group({ prefix: "/users", name: "users." }, (users) => {
    users.get("/", (ctx) => ctx.json({ users: store.users })).name("index");
    users.get<{ id: string }>("/:id", (ctx) => { /* ... */ }).name("show");

    users.group({ prefix: "/:userId/posts", name: "posts." }, (userPosts) => {
      userPosts.get<{ userId: string }>("/", (ctx) => { /* ... */ }).name("index");
    });
  });
}
```

`src/router.ts` puts the modules in an `/api` group named `api.`:

```typescript
const router = createRouter(options); // e.g. { basePath: "/v1" }

router.group({ prefix: "/api", name: "api." }, (api) => {
  registerUserRoutes(api, store);
  registerPostRoutes(api, store);
});

router.route("api.users.posts.index", { userId: 1 }); // "/api/users/1/posts"
router.route("api.posts.index", { authorId: 1 });     // "/api/posts?authorId=1"
```

With `basePath: "/v1"` every path and every generated URL gets the `/v1` prefix.

## Errors

A handler that cannot find a record throws an `HttpError` subclass from `@bunary/http`
(`NotFoundError` here; `BadRequestError`, `ConflictError`, … and `abort()` work the same way).
The router catches it and renders an RFC 9457 `application/problem+json` response:

```typescript
import { NotFoundError } from "@bunary/http";

users.get<{ id: string }>("/:id", (ctx) => {
  const user = store.users.find((u) => u.id === ctx.params.id);
  if (!user) throw new NotFoundError("User not found");
  return ctx.json({ user });
});
```

```json
{ "type": "about:blank", "title": "Not Found", "status": 404, "detail": "User not found", "instance": "/api/users/999" }
```

An unmatched path gets the same shape from the router itself. When you need to *return* an
error response instead of throwing (e.g. from a helper), use `problem(status, detail)`; the
[auth example](../auth) does that for its 401s.

## Running

```bash
bun install

bun run dev        # hot reload
bun run start      # or start normally

bun test           # tests
bun run typecheck  # tsc --noEmit
```

The server listens on port 3000 (`http.port` in `bunary.config.ts`).

## Endpoints

| Method | Path | Route name | Description |
|--------|------|------------|-------------|
| GET | `/` | `health` | Health check |
| GET | `/api/users` | `api.users.index` | List all users |
| POST | `/api/users` | `api.users.store` | Create user |
| GET | `/api/users/:id` | `api.users.show` | Get user by ID |
| DELETE | `/api/users/:id` | `api.users.destroy` | Delete user |
| GET | `/api/users/:userId/posts` | `api.users.posts.index` | List one user's posts |
| GET | `/api/posts` | `api.posts.index` | List all posts (optional `?authorId=`) |
| POST | `/api/posts` | `api.posts.store` | Create post |
| GET | `/api/posts/:id` | `api.posts.show` | Get post by ID |

## Example Requests

```bash
# List users
curl http://localhost:3000/api/users

# Get single user
curl http://localhost:3000/api/users/1

# A user's posts (nested group)
curl http://localhost:3000/api/users/1/posts

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dave", "email": "dave@example.com"}'

# Filter posts by author
curl "http://localhost:3000/api/posts?authorId=1"
```
