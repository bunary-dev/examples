/**
 * Bunary configuration: the app, the HTTP port and the `auth` key read by
 * `authProvider` (two guards over one user provider).
 */

import { createJwtGuard, createSessionGuard } from "@bunary/auth";
import type {} from "@bunary/auth/provider";
import { type BunaryConfig, defineConfig, env, isProd } from "@bunary/core";
import type {} from "@bunary/http/provider";
import type { Secrets } from "./secrets.js";
import { createUserProvider, type UserStore } from "./users.js";

export function buildConfig(users: UserStore, secrets: Secrets): BunaryConfig {
	const provider = createUserProvider(users);

	return defineConfig({
		app: {
			name: "auth-example",
		},
		http: {
			port: env("PORT", 3000),
		},
		auth: {
			defaultGuard: "jwt",
			provider,
			guards: {
				// Authorization: Bearer <token>. Tokens hold only `sub` (the user id) and
				// expire after an hour; mapUser loads the user from the store, so
				// a deleted user's tokens stop working.
				jwt: createJwtGuard({
					secret: secrets.jwtSecret,
					provider,
					ttlSeconds: 3600,
					mapUser: (payload) => users.findById(Number(payload.sub)),
				}),
				// Encrypted cookie (`bunary_session`), HttpOnly and SameSite=Lax.
				// Secure in production; plain HTTP is fine on localhost.
				session: createSessionGuard({
					provider,
					secret: secrets.sessionSecret,
					secure: isProd(),
				}),
			},
		},
	});
}
