/**
 * The example's routes.
 *
 *   GET  /                  health, lists the endpoints
 *   POST /login             JWT guard: credentials → { user, token }
 *   GET  /me                requireAuth (jwt)      → { user }
 *   POST /session/login     session guard: credentials → { user } + cookie
 *   GET  /session/me        requireAuth (session)  → { user }
 *   POST /session/logout    clears the session cookie
 *
 * `authMiddleware()` puts the request's auth context on `ctx.locals.auth`
 * for every route; `requireAuth()` on a group answers guests with 401 and
 * sets `ctx.locals.user` for the routes inside.
 */

import { type AuthUserLocals, authMiddleware, requireAuth } from "@bunary/auth/provider";
import { createRouter, problem, type Router } from "@bunary/http";
import type { PublicUser } from "./users.js";

export type Locals = AuthUserLocals<PublicUser>;
export type ExampleRouter = Router<Locals>;

const ENDPOINTS = [
	"POST /login",
	"GET /me",
	"POST /session/login",
	"GET /session/me",
	"POST /session/logout",
];

const invalidCredentials = () => problem(401, "Invalid email or password");

export function buildRouter(): ExampleRouter {
	const router = createRouter<Locals>();

	router.use(authMiddleware<Locals>());

	router.get("/", () => ({ status: "ok", message: "Auth Example", endpoints: ENDPOINTS }));

	// JWT guard (the default guard)
	router.post("/login", async (ctx) => {
		const result = await ctx.locals.auth.attempt(await ctx.body.json(), "jwt");
		if (!result) return invalidCredentials();
		return { user: result.user, token: result.token };
	});

	router.group({ prefix: "/me", middleware: [requireAuth<Locals>({ guard: "jwt" })] }, (me) => {
		me.get("/", (ctx) => ({ user: ctx.locals.user }));
	});

	// Session guard
	router.group("/session", (session) => {
		session.post("/login", async (ctx) => {
			const result = await ctx.locals.auth.attempt(await ctx.body.json(), "session");
			if (!result) return invalidCredentials();
			return { user: result.user };
		});

		session.post("/logout", async (ctx) => {
			await ctx.locals.auth.logout("session");
			return new Response(null, { status: 204 });
		});

		session.group({ prefix: "/", middleware: [requireAuth<Locals>({ guard: "session" })] }, (authed) => {
			authed.get("/me", (ctx) => ({ user: ctx.locals.user }));
		});
	});

	return router;
}
