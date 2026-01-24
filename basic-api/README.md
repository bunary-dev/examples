# Basic API Example

A complete example demonstrating all core features of the Bunary framework.

## Features Demonstrated

- ✅ **Route Definition** - Using `createApp` from `@bunary/http` to define HTTP endpoints
- ✅ **Path Parameters** - `:id` syntax for dynamic route segments
- ✅ **Query Parameters** - Accessing query string values
- ✅ **JSON Serialization** - Automatic JSON response handling
- ✅ **Middleware Pipeline** - Request logging middleware
- ✅ **Environment Helpers** - `env()`, `isDev()` for configuration

## Quick Start

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev

# Or build and run production
bun run build
bun run start
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome message with environment info |
| GET | `/health` | Health check endpoint |
| GET | `/users/:id` | Get user by ID (path params) |
| GET | `/users/:userId/posts/:postId` | Get post (multiple path params) |
| GET | `/items?page=1&limit=10` | List items with pagination (query params) |
| POST | `/resources` | Create a new resource |
| PUT | `/resources/:id` | Update a resource |
| DELETE | `/resources/:id` | Delete a resource |

## Example Requests

```bash
# Welcome
curl http://localhost:3000/

# Health check
curl http://localhost:3000/health

# Get user by ID
curl http://localhost:3000/users/123

# Get post by user and post ID
curl http://localhost:3000/users/1/posts/42

# List items with pagination
curl "http://localhost:3000/items?page=2&limit=5&search=test"

# Create resource
curl -X POST http://localhost:3000/resources \
  -H "Content-Type: application/json" \
  -d '{"name": "My Resource", "type": "example"}'

# Update resource
curl -X PUT http://localhost:3000/resources/abc123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Resource"}'

# Delete resource
curl -X DELETE http://localhost:3000/resources/abc123
```

## Project Structure

```
basic-api/
├── package.json          # Dependencies and scripts
├── bunary.config.ts      # Bunary configuration
├── src/
│   └── index.ts          # Application entry point
└── README.md             # This file
```

## Configuration

The `bunary.config.ts` file uses `defineConfig()` for type-safe configuration:

```typescript
import { defineConfig } from "@bunary/core";

export default defineConfig({
  app: {
    name: "basic-api",
    env: "development",
  },
});
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `APP_ENV` | `development` | Application environment |

## Learn More

- [@bunary/core](https://github.com/bunary-dev/core) - Core utilities and configuration
- [@bunary/http](https://github.com/bunary-dev/http) - HTTP routing and middleware
- [Bunary Documentation](https://github.com/bunary-dev) - Full framework docs
