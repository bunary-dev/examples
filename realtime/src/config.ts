/**
 * Bunary configuration: the app name and the HTTP port `serve()` reads.
 */

import { type BunaryConfig, defineConfig, env } from "@bunary/core";
import type {} from "@bunary/http/provider";

export function buildConfig(): BunaryConfig {
	return defineConfig({
		app: {
			name: "realtime-example",
		},
		http: {
			port: env("PORT", 3000),
		},
	});
}
