import { defineConfig, env } from "@bunary/core";
// Adds the `http` namespace to BunaryConfig.
import type {} from "@bunary/http/provider";

/**
 * Bunary application configuration.
 *
 * This file configures your Bunary application using the defineConfig helper.
 * All configuration is type-safe and validated at runtime.
 */
export default defineConfig({
  app: {
    // Application name - used in logs and identification
    name: "basic-api",
  },
  http: {
    // Port serve() binds to
    port: env("PORT", 3000),
  },
});
