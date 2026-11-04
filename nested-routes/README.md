# Nested Routes Example

Organizes an API into **nested route groups** with **named routes**, mounted on a
`@bunary/core` Application.

Targets `@bunary/core` **^0.4.0** and `@bunary/http` **^0.7.2** (Bun ≥ 1.4.0).

## What it shows

- `createRouter()` from `@bunary/http`, with optional `basePath`
- Route groups (`router.group({ prefix, name }, cb)`), nested two levels deep
- Named routes (`.name()`) whose names stack with each group's name prefix, and URL
  generation with `router.route(name, params)`
- Route model binding: `{ bind: { … } }` resolvers turn `:user` / `:post` into records on
  `ctx.bound`, including a post lookup scoped to its user
- Missing records answered as `application/problem+json` 404s
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
    users.get("/:user", { bind: { user: findUser } }, (ctx) => ctx.json({ user: ctx.bound.user })).name("show");

    users.group({ prefix: "/:user/posts", name: "posts." }, (userPosts) => {
      userPosts.get("/", { bind: { user: findUser } }, (ctx) => { /* ... */ }).name("index");
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

router.route("api.users.posts.index", { user: 1 }); // "/api/users/1/posts"
router.route("api.posts.index", { authorId: 1 });     // "/api/posts?authorId=1"
```

With `basePath: "/v1"` every path and every generated URL gets the `/v1` prefix.

## Route model binding

Routes that take a record id name the param after the record (`:user`, `:post`) and declare a
resolver for it in `bind`. The router runs the resolver before the handler and puts the result on
a typed `ctx.bound`, so the handler never looks anything up itself:

```typescript
const findUser = (id: string | undefined) => store.users.find((u) => u.id === id);

users.get("/:user", { bind: { user: findUser } }, (ctx) => ctx.json({ user: ctx.bound.user }));
```

Bindings resolve one at a time in path order, so a child resolver can scope its lookup to its
parent through `ctx.bound`. `GET /api/users/:user/posts/:post` only finds posts written by that
user:

```typescript
import type { BindingContext } from "@bunary/http";

const findUserPost = (id: string | undefined, ctx: BindingContext) => {
  const user = ctx.bound.user as User; // untyped inside a resolver; cast it
  return store.posts.find((p) => p.id === id && p.authorId === user.id);
};

userPosts.get("/:post", { bind: { user: findUser, post: findUserPost } }, (ctx) =>
  ctx.json({ user: ctx.bound.user, post: ctx.bound.post }),
);
```

## Errors

A resolver that returns `null` or `undefined` stops the request before the handler runs. The
router answers with an RFC 9457 `application/problem+json` 404 whose detail is
`"<key> not found"`:

```json
{ "type": "about:blank", "title": "Not Found", "status": 404, "detail": "user not found", "instance": "/api/users/999" }
```

`/api/users/1/posts/3` is a 404 (`"post not found"`) even though post 3 exists, because it
belongs to user 2. A missing user is reported first (`/api/users/999/posts/1` →
`"user not found"`), since the post resolver never runs without one.

To answer with something else, throw from the resolver: `abort(410)`, or an `HttpError` subclass
such as `NotFoundError("…")`, gets the same problem+json rendering. Handlers can throw these too.

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
| GET | `/api/users/:user` | `api.users.show` | Get user by ID |
| DELETE | `/api/users/:user` | `api.users.destroy` | Delete user |
| GET | `/api/users/:user/posts` | `api.users.posts.index` | List one user's posts |
| GET | `/api/users/:user/posts/:post` | `api.users.posts.show` | Get one of a user's posts (404 if another user wrote it) |
| GET | `/api/posts` | `api.posts.index` | List all posts (optional `?authorId=`) |
| POST | `/api/posts` | `api.posts.store` | Create post |
| GET | `/api/posts/:post` | `api.posts.show` | Get post by ID |

## Example Requests

```bash
# List users
curl http://localhost:3000/api/users

# Get single user
curl http://localhost:3000/api/users/1

# A user's posts (nested group)
curl http://localhost:3000/api/users/1/posts

# One of a user's posts (scoped binding; /api/users/1/posts/3 is a 404)
curl http://localhost:3000/api/users/1/posts/2

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dave", "email": "dave@example.com"}'

# Filter posts by author
curl "http://localhost:3000/api/posts?authorId=1"
```
