# Nested Routes Example

This example demonstrates how to organize routes into separate modules using a simple prefix pattern.

## Structure

```
src/
├── index.ts              # Entry point - creates app and registers routes
└── routes/
    ├── index.ts          # Central route registration
    ├── users.ts          # User resource routes
    └── posts.ts          # Post resource routes
```

## Pattern

Each route module exports a function that takes the app and a prefix:

```typescript
export function registerUserRoutes(app: BunaryApp, prefix: string): void {
  app.get(`${prefix}`, () => { /* list */ });
  app.get(`${prefix}/:id`, (ctx) => { /* get one */ });
  app.post(`${prefix}`, async (ctx) => { /* create */ });
  app.delete(`${prefix}/:id`, (ctx) => { /* delete */ });
}
```

Then register in the central routes file:

```typescript
export function registerRoutes(app: BunaryApp): void {
  registerUserRoutes(app, "/api/users");
  registerPostRoutes(app, "/api/posts");
}
```

## Running

```bash
# Install dependencies
bun install

# Run with hot reload
bun run dev

# Or start normally
bun run start
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/posts` | List all posts |
| GET | `/api/posts?authorId=1` | Filter posts by author |
| GET | `/api/posts/:id` | Get post by ID |
| POST | `/api/posts` | Create post |

## Example Requests

```bash
# List users
curl http://localhost:3000/api/users

# Get single user
curl http://localhost:3000/api/users/1

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dave", "email": "dave@example.com"}'

# Filter posts by author
curl "http://localhost:3000/api/posts?authorId=1"
```
