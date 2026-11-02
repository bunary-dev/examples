import { defineConfig } from "@bunary/core";
import type {} from "@bunary/http/provider";

/**
 * Bunary application configuration.
 *
 * `http` is read by `serve()` from `@bunary/http/provider`. The environment
 * comes from APP_ENV / NODE_ENV (default: development).
 */
export default defineConfig({
	app: {
		name: "nested-routes-example",
	},
	http: {
		port: 3000,
	},
});
