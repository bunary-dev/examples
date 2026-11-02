/**
 * The @bunary/core Application: `authProvider` builds the auth manager from
 * the `auth` config key, `httpProvider` mounts the router (and sets `ctx.app`,
 * which `authMiddleware()` / `requireAuth()` resolve the manager from).
 */

import { authProvider } from "@bunary/auth/provider";
import { type Application, createApp } from "@bunary/core";
import { httpProvider } from "@bunary/http/provider";
import { buildConfig } from "./config.js";
import { buildRouter, type ExampleRouter } from "./router.js";
import type { Secrets } from "./secrets.js";
import type { UserStore } from "./users.js";

export type { ExampleRouter } from "./router.js";

export interface ExampleOptions {
	users: UserStore;
	secrets: Secrets;
}

export function createExampleApp({ users, secrets }: ExampleOptions): { app: Application; router: ExampleRouter } {
	const router = buildRouter();
	const app = createApp({
		config: buildConfig(users, secrets),
		providers: [authProvider, httpProvider(router)],
	});
	return { app, router };
}
