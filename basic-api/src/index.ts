/**
 * Basic API Example
 *
 * This example demonstrates the core features of the Bunary framework:
 * - Route definition with createApp()
 * - Path parameters (:id syntax)
 * - Query parameters
 * - JSON serialization
 * - Middleware pipeline
 * - Environment helpers
 */

import { env, isDev } from "@bunary/core";
import { createApp } from "@bunary/http";

// ============================================================================
// App Creation
// ============================================================================

const app = createApp();

// ============================================================================
// Middleware Examples
// ============================================================================

/**
 * Logging middleware
 *
 * Logs all incoming requests with method, path.
 * This middleware doesn't modify the response, just logs and passes through.
 */
app.use(async (ctx, next) => {
  const method = ctx.request.method;
  const url = new URL(ctx.request.url);
  const start = Date.now();

  // Call next middleware/handler
  const response = await next();

  const duration = Date.now() - start;
  console.log(`${method} ${url.pathname} - ${duration}ms`);

  return response;
});

// ============================================================================
// Routes
// ============================================================================

// ----------------------------------------------------------------------------
// Basic Routes
// ----------------------------------------------------------------------------

/**
 * Health check endpoint
 * GET /health
 *
 * Returns the current status of the API.
 */
app.get("/health", () => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
  };
});

/**
 * Welcome endpoint
 * GET /
 *
 * Returns a welcome message with environment info.
 */
app.get("/", () => {
  return {
    message: "Welcome to Bunary!",
    environment: isDev() ? "development" : "production",
    docs: "/docs",
  };
});

// ----------------------------------------------------------------------------
// Path Parameters Example
// ----------------------------------------------------------------------------

/**
 * Get user by ID
 * GET /users/:id
 *
 * Demonstrates path parameter extraction.
 * The :id segment is extracted and available in ctx.params.
 */
app.get("/users/:id", (ctx) => {
  const userId = ctx.params.id;

  // In a real app, you'd fetch from a database
  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
  };
});

/**
 * Get post by user and post ID
 * GET /users/:userId/posts/:postId
 *
 * Demonstrates multiple path parameters.
 */
app.get("/users/:userId/posts/:postId", (ctx) => {
  const { userId, postId } = ctx.params;

  return {
    userId,
    postId,
    title: `Post ${postId} by User ${userId}`,
    content: "This is a sample post content.",
  };
});

// ----------------------------------------------------------------------------
// Query Parameters Example
// ----------------------------------------------------------------------------

/**
 * List items with pagination
 * GET /items?page=1&limit=10&search=term
 *
 * Demonstrates query parameter handling.
 */
app.get("/items", (ctx) => {
  const page = parseInt(ctx.query.get("page") || "1", 10);
  const limit = parseInt(ctx.query.get("limit") || "10", 10);
  const search = ctx.query.get("search") || "";

  // Generate sample items
  const items = Array.from({ length: limit }, (_, i) => ({
    id: (page - 1) * limit + i + 1,
    name: `Item ${(page - 1) * limit + i + 1}`,
  }));

  return {
    page,
    limit,
    search: search || null,
    total: 100,
    items,
  };
});

// ----------------------------------------------------------------------------
// POST/PUT/DELETE Examples
// ----------------------------------------------------------------------------

/**
 * Create a new resource
 * POST /resources
 *
 * Demonstrates handling POST requests with JSON body.
 */
app.post("/resources", async (ctx) => {
  const body = await ctx.request.json();

  return new Response(
    JSON.stringify({
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }
  );
});

/**
 * Update a resource
 * PUT /resources/:id
 */
app.put("/resources/:id", async (ctx) => {
  const body = await ctx.request.json();

  return {
    id: ctx.params.id,
    ...body,
    updatedAt: new Date().toISOString(),
  };
});

/**
 * Delete a resource
 * DELETE /resources/:id
 */
app.delete("/resources/:id", (ctx) => {
  return {
    message: `Resource ${ctx.params.id} deleted`,
    deletedAt: new Date().toISOString(),
  };
});

// ============================================================================
// Server Start
// ============================================================================

const port = parseInt(env("PORT", "3000"), 10);

const server = app.listen({ port });

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
