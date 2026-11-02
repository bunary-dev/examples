/**
 * Builds the example's router.
 *
 * Route groups nest prefixes and route names:
 *
 *   router                      health          GET /
 *   └─ /api        (api.)
 *      ├─ /users   (users.)     index/store     GET|POST /api/users
 *      │  │                     show/destroy    GET|DELETE /api/users/:id
 *      │  └─ /:userId/posts (posts.)  index     GET /api/users/:userId/posts
 *      └─ /posts   (posts.)     index/store     GET|POST /api/posts
 *                               show            GET /api/posts/:id
 *
 * So `router.route("api.users.posts.index", { userId: 1 })` is
 * `/api/users/1/posts`. Pass `basePath` to mount everything under a prefix.
 */

import { createRouter, type Router, type RouterOptions } from "@bunary/http";
import { createStore } from "./data.js";
import { registerPostRoutes } from "./routes/posts.js";
import { registerUserRoutes } from "./routes/users.js";

export function buildRouter(options: RouterOptions = {}): Router {
	const store = createStore();
	const router = createRouter(options);

	// Health check, listing URLs generated from the named routes
	router
		.get("/", (ctx) =>
			ctx.json({
				status: "ok",
				message: "Nested Routes Example",
				endpoints: [router.route("api.users.index"), router.route("api.posts.index")],
			}),
		)
		.name("health");

	router.group({ prefix: "/api", name: "api." }, (api) => {
		registerUserRoutes(api, store);
		registerPostRoutes(api, store);
	});

	return router;
}
