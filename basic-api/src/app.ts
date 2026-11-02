/**
 * Basic API Example
 *
 * This example demonstrates the core features of the Bunary framework:
 * - Route definition with createRouter() from @bunary/http
 * - Application and config with createApp()/defineConfig() from @bunary/core
 * - Path parameters (:id syntax)
 * - Query parameters
 * - JSON serialization and response helpers
 * - Middleware pipeline
 * - Environment helpers
 */

import { type Application, createApp, isDev } from "@bunary/core";
import { createRouter } from "@bunary/http";
import { httpProvider } from "@bunary/http/provider";
import config from "../bunary.config";

// ============================================================================
// Router Creation
// ============================================================================

export const router = createRouter();

// ============================================================================
// Middleware Examples
// ============================================================================

/**
 * Logging middleware
 *
 * Logs all incoming requests with method, path.
 * This middleware doesn't modify the response, just logs and passes through.
 */
router.use(async (ctx, next) => {
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
router.get("/health", () => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
  };
});

/**
 * Welcome endpoint
 * GET /
 *
 * Returns a welcome message with environment info. The app name is read from
 * bunary.config.ts through the Application that httpProvider exposes as ctx.app.
 */
router.get("/", (ctx) => {
  return {
    message: "Welcome to Bunary!",
    app: ctx.app?.config.get<string>("app.name"),
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
router.get("/users/:id", (ctx) => {
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
router.get("/users/:userId/posts/:postId", (ctx) => {
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
router.get("/items", (ctx) => {
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
 * Demonstrates reading a JSON body with ctx.body.json() and setting a status
 * with the ctx.json() response helper.
 */
router.post("/resources", async (ctx) => {
  const body = await ctx.body.json<Record<string, unknown>>();

  return ctx.json(
    {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
});

/**
 * Update a resource
 * PUT /resources/:id
 */
router.put("/resources/:id", async (ctx) => {
  const body = await ctx.body.json<Record<string, unknown>>();

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
router.delete("/resources/:id", (ctx) => {
  return {
    message: `Resource ${ctx.params.id} deleted`,
    deletedAt: new Date().toISOString(),
  };
});

// ============================================================================
// Application
// ============================================================================

/**
 * Create and boot the application: config from bunary.config.ts, with the
 * router mounted by httpProvider. Nothing listens until serve() is called.
 */
export function createBasicApi(): Promise<Application> {
  return createApp({ config, providers: [httpProvider(router)] }).boot();
}
