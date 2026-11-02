/**
 * The application: one @bunary/core app, four providers.
 *
 *   ormProvider     database config key → Drizzle database   → DatabaseToken
 *   modelsProvider  DatabaseToken       → User / Note models → ModelsToken
 *   authProvider    auth config key     → auth manager       → AuthToken
 *   httpProvider    the router                               → RouterToken
 *
 * Registers run in this order, so each provider finds the bindings it needs.
 */

import { authProvider } from "@bunary/auth/provider";
import { type Application, createApp } from "@bunary/core";
import { httpProvider } from "@bunary/http/provider";
import { ormProvider } from "@bunary/orm/provider";
import { type AppOptions, buildConfig } from "./config.js";
import * as schema from "./db/schema.js";
import { ModelsToken, modelsProvider } from "./models.js";
import { buildRouter, type FullAppRouter } from "./router.js";
import { createUserProvider } from "./users.js";

export type { FullAppRouter } from "./router.js";

export function createFullApp(options: AppOptions): { app: Application; router: FullAppRouter } {
	const router = buildRouter();
	// The user provider is part of the config, but the models are bound only
	// once the app registers: it resolves them from the app when a request
	// needs them.
	const users = createUserProvider(() => app.get(ModelsToken));
	const app: Application = createApp({
		config: buildConfig(options, users),
		providers: [ormProvider({ schema }), modelsProvider, authProvider, httpProvider(router)],
	});
	return { app, router };
}
