/**
 * Application Configuration
 *
 * Main app configuration using @bunary/core
 */
import { defineConfig } from "@bunary/core";

export default defineConfig({
	app: {
		name: "Basic ORM Example",
		env: "development",
		debug: true,
	},
});
