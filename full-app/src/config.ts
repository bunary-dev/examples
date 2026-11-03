/**
 * Configuration: the options read from the environment with `env()`, and the
 * Bunary config built from them with `defineConfig()`. Each provider reads
 * its own key: `http` (httpProvider), `database` (ormProvider) and `auth`
 * (authProvider).
 */

import { createJwtGuard, type UserProvider } from "@bunary/auth";
import type {} from "@bunary/auth/provider";
import { type BunaryConfig, defineConfig, env, isProd } from "@bunary/core";
import type {} from "@bunary/http/provider";
import type { PublicUser } from "./users.js";

/** SQLite file used when DATABASE_PATH is unset. */
export const DEFAULT_DATABASE_PATH = "./full-app.sqlite";

/** Dev-only HMAC secret for the JWT guard. Public, so production refuses it. */
export const DEV_JWT_SECRET = "dev-only-jwt-secret-do-not-use-in-production";

export interface AppOptions {
	/** SQLite file path, or ":memory:" */
	databasePath: string;
	/** HMAC secret that signs and verifies JWTs (HS256) */
	jwtSecret: string;
}

/**
 * DATABASE_PATH and JWT_SECRET, with dev defaults outside production.
 *
 * @throws {Error} In production, when JWT_SECRET is unset
 */
export function loadOptions(): AppOptions {
	const jwtSecret = env("JWT_SECRET");
	if (jwtSecret === undefined && isProd()) throw new Error("JWT_SECRET must be set in production");
	return {
		databasePath: env("DATABASE_PATH", DEFAULT_DATABASE_PATH),
		jwtSecret: jwtSecret ?? DEV_JWT_SECRET,
	};
}

export function buildConfig(options: AppOptions, users: UserProvider<PublicUser>): BunaryConfig {
	return defineConfig({
		app: {
			name: "full-app",
		},
		http: {
			port: env("PORT", 3000),
		},
		database: {
			dialect: "sqlite",
			path: options.databasePath,
		},
		auth: {
			defaultGuard: "jwt",
			provider: users,
			guards: {
				// Authorization: Bearer <token>. Tokens hold only `sub` (the user id)
				// and expire after an hour. Every request loads that user through the
				// user provider, so a token for a deleted user is unauthenticated
				// (null); a lookup that throws or rejects is too (auth handles it).
				jwt: createJwtGuard({
					secret: options.jwtSecret,
					provider: users,
					ttlSeconds: 3600,
					mapUser: async (payload) => {
						if (typeof payload.sub !== "string" && typeof payload.sub !== "number") return null;
						return await users.retrieveById(payload.sub);
					},
				}),
			},
		},
	});
}
