import { defineConfig } from "@bunary/core";

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

    // Environment - controls behavior like logging and error display
    // Use env("APP_ENV", "development") in production
    env: "development",
  },
});
