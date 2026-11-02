/**
 * Package metadata: examples are never published, and depend only on the
 * published @bunary packages (plus Drizzle).
 */

import { describe, expect, it } from "bun:test";
import pkg from "../package.json";

describe("package.json", () => {
	it("is private", () => {
		expect((pkg as { private?: boolean }).private).toBe(true);
	});

	it("depends only on @bunary/core, http, orm and auth ^0.4.0 from npm, and drizzle-orm", () => {
		expect(pkg.dependencies).toEqual({
			"@bunary/auth": "^0.4.0",
			"@bunary/core": "^0.4.0",
			"@bunary/http": "^0.4.0",
			"@bunary/orm": "^0.4.0",
			"drizzle-orm": "^0.45.0",
		});
		expect(pkg.devDependencies["drizzle-kit"]).toBe("^0.31.0");
	});

	it("migrates in db:setup and before dev", () => {
		expect(pkg.scripts["db:setup"]).toBe("bun run src/db/setup.ts");
		expect(pkg.scripts.dev).toStartWith("bun run db:setup && ");
		expect(pkg.scripts.test).toBe("bun test");
		expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
	});
});
