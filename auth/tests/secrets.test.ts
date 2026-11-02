/**
 * Secrets come from the environment, with a dev-only default that production
 * refuses.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { DEV_JWT_SECRET, DEV_SESSION_SECRET, loadSecrets, secretFromEnv } from "../src/secrets.js";

const KEYS = ["EXAMPLE_SECRET", "JWT_SECRET", "SESSION_SECRET", "APP_ENV"] as const;
const saved = Object.fromEntries(KEYS.map((key) => [key, Bun.env[key]]));

afterEach(() => {
	for (const key of KEYS) {
		if (saved[key] === undefined) delete Bun.env[key];
		else Bun.env[key] = saved[key];
	}
});

describe("secretFromEnv", () => {
	it("reads the variable when it is set", () => {
		Bun.env.EXAMPLE_SECRET = "from-env";

		expect(secretFromEnv("EXAMPLE_SECRET", "dev-default")).toBe("from-env");
	});

	it("falls back to the dev default outside production", () => {
		delete Bun.env.EXAMPLE_SECRET;
		Bun.env.APP_ENV = "development";

		expect(secretFromEnv("EXAMPLE_SECRET", "dev-default")).toBe("dev-default");
	});

	it("refuses the dev default in production", () => {
		delete Bun.env.EXAMPLE_SECRET;
		Bun.env.APP_ENV = "production";

		expect(() => secretFromEnv("EXAMPLE_SECRET", "dev-default")).toThrow("EXAMPLE_SECRET");
	});
});

describe("loadSecrets", () => {
	it("uses JWT_SECRET and SESSION_SECRET", () => {
		Bun.env.JWT_SECRET = "jwt-from-env";
		Bun.env.SESSION_SECRET = "session-key-from-env-32-bytes!!!";

		expect(loadSecrets()).toEqual({ jwtSecret: "jwt-from-env", sessionSecret: "session-key-from-env-32-bytes!!!" });
	});

	it("defaults to the documented dev secrets", () => {
		delete Bun.env.JWT_SECRET;
		delete Bun.env.SESSION_SECRET;
		Bun.env.APP_ENV = "development";

		expect(loadSecrets()).toEqual({ jwtSecret: DEV_JWT_SECRET, sessionSecret: DEV_SESSION_SECRET });
	});

	it("has a dev session key of exactly 32 bytes, as the session guard needs", () => {
		expect(new TextEncoder().encode(DEV_SESSION_SECRET).length).toBe(32);
	});
});
