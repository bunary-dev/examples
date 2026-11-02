/**
 * Guard secrets, read from the environment with `env()` from @bunary/core.
 *
 * Each has a dev-only default so `bun run dev` works out of the box. The
 * defaults are public (they are in this file), so production refuses them:
 * with APP_ENV / NODE_ENV = production an unset variable throws at startup.
 */

import { env, isProd } from "@bunary/core";

/** Dev-only HMAC secret for the JWT guard. Set JWT_SECRET for real use. */
export const DEV_JWT_SECRET = "dev-only-jwt-secret-do-not-use-in-production";

/** Dev-only session encryption key (exactly 32 bytes). Set SESSION_SECRET for real use. */
export const DEV_SESSION_SECRET = "dev-only-session-key-32-bytes!!!";

export interface Secrets {
	/** HMAC secret that signs and verifies JWTs (HS256) */
	jwtSecret: string;
	/** Key that encrypts the session cookie: exactly 32 bytes */
	sessionSecret: string;
}

/**
 * Read `name` from the environment, or fall back to `devDefault` outside
 * production.
 *
 * @throws {Error} In production, when the variable is unset
 */
export function secretFromEnv(name: string, devDefault: string): string {
	const value = env(name);
	if (value !== undefined) return value;
	if (isProd()) throw new Error(`${name} must be set in production`);
	return devDefault;
}

/** JWT_SECRET and SESSION_SECRET, with their dev defaults. */
export function loadSecrets(): Secrets {
	return {
		jwtSecret: secretFromEnv("JWT_SECRET", DEV_JWT_SECRET),
		sessionSecret: secretFromEnv("SESSION_SECRET", DEV_SESSION_SECRET),
	};
}
