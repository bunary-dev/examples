/**
 * Routes Index
 *
 * Central place to register all route modules.
 * This pattern keeps the main entry point clean.
 */

import type { BunaryApp } from "@bunary/http";
import { registerPostRoutes } from "./posts.js";
import { registerUserRoutes } from "./users.js";

/**
 * Register all API routes with their prefixes.
 */
export function registerRoutes(app: BunaryApp): void {
	// Each module handles its own routes under a prefix
	registerUserRoutes(app, "/api/users");
	registerPostRoutes(app, "/api/posts");
}
