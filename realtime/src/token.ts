/**
 * The chat token: who may open a WebSocket on /chat/:room.
 *
 * Read from CHAT_TOKEN with `env()` from @bunary/core. The dev default is
 * public (it is in this file), so production refuses it: with APP_ENV /
 * NODE_ENV = production an unset CHAT_TOKEN throws at startup.
 */

import { timingSafeEqual } from "node:crypto";
import { env, isProd } from "@bunary/core";
import { type Middleware, problem } from "@bunary/http";

/** Dev-only chat token. Set CHAT_TOKEN for real use. */
export const DEV_CHAT_TOKEN = "dev-only-chat-token";

/**
 * CHAT_TOKEN, or the dev default outside production.
 *
 * @throws {Error} In production, when CHAT_TOKEN is unset
 */
export function loadChatToken(): string {
	const value = env("CHAT_TOKEN");
	if (value !== undefined) return value;
	if (isProd()) throw new Error("CHAT_TOKEN must be set in production");
	return DEV_CHAT_TOKEN;
}

/** The token from `Authorization: Bearer <token>`, else from `?token=` (browsers can't set WebSocket headers). */
function presentedToken(request: Request, query: URLSearchParams): string | null {
	const header = request.headers.get("authorization");
	if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
	return query.get("token");
}

function sameToken(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Middleware answering 401 unless the request carries `token`. On a
 * WebSocket route it runs before the upgrade, so a rejected client never
 * gets a socket.
 */
export function requireChatToken<TLocals extends object>(token: string): Middleware<TLocals> {
	return (ctx, next) => {
		const presented = presentedToken(ctx.request, ctx.query);
		if (presented === null || !sameToken(presented, token)) {
			return problem(401, "A valid chat token is required", { headers: { "WWW-Authenticate": "Bearer" } });
		}
		return next();
	};
}
