/**
 * Basic API Example - server entry point
 *
 * Boots the application from src/app.ts and starts the HTTP server on the
 * port configured in bunary.config.ts (PORT, default 3000).
 */

import { isDev } from "@bunary/core";
import { serve } from "@bunary/http/provider";
import { createBasicApi } from "./app";

const app = await createBasicApi();
const server = serve(app);

console.log(`
🚀 Bunary Basic API Example

Server running at http://localhost:${server.port}

Available endpoints:
  GET  /           - Welcome message
  GET  /health     - Health check
  GET  /users/:id  - Get user by ID
  GET  /users/:userId/posts/:postId - Get post
  GET  /items?page=1&limit=10       - List items with pagination
  POST /resources  - Create resource
  PUT  /resources/:id - Update resource
  DELETE /resources/:id - Delete resource

Environment: ${isDev() ? "development" : "production"}
`);
