/**
 * Nested Routes Example
 *
 * This example demonstrates organizing routes into separate modules
 * using a simple prefix pattern. This approach:
 *
 * - Keeps each resource's routes in its own file
 * - Uses a consistent prefix pattern for nesting
 * - Maintains a clean main entry point
 *
 * Routes:
 *   GET    /                    - Health check
 *   GET    /api/users           - List all users
 *   GET    /api/users/:id       - Get user by ID
 *   POST   /api/users           - Create user
 *   DELETE /api/users/:id       - Delete user
 *   GET    /api/posts           - List all posts (optional ?authorId filter)
 *   GET    /api/posts/:id       - Get post by ID
 *   POST   /api/posts           - Create post
 */

import { createApp } from "@bunary/http";
import { registerRoutes } from "./routes/index.js";

const app = createApp();

// Health check at root
app.get("/", () => ({
	status: "ok",
	message: "Nested Routes Example",
	endpoints: ["/api/users", "/api/posts"],
}));

// Register all API routes from modules
registerRoutes(app);

// Start server
const port = 3000;
const server = app.listen({ port });
console.log(`🚀 Server running on http://localhost:${server.port}`);
console.log(`
Try these endpoints:
  GET  http://localhost:3000/
  GET  http://localhost:3000/api/users
  GET  http://localhost:3000/api/users/1
  GET  http://localhost:3000/api/posts
  GET  http://localhost:3000/api/posts?authorId=1
`);
