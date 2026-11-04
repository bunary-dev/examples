/**
 * Package metadata: examples are never published, and depend only on the
 * published @bunary packages.
 */

import { describe, expect, it } from "bun:test";
import pkg from "../package.json";

describe("package.json", () => {
	it("is private", () => {
		expect((pkg as { private?: boolean }).private).toBe(true);
	});

	it("depends on @bunary/core ^0.4.0 from npm", () => {
		expect(pkg.dependencies).toEqual({ "@bunary/core": "^0.4.0" });
	});

	it("has @bunary/cli ^0.4.6 as a devDependency for `bunx bunary`", () => {
		expect(pkg.devDependencies["@bunary/cli"]).toBe("^0.4.6");
	});

	it("has test and typecheck scripts", () => {
		expect(pkg.scripts.test).toBe("bun test");
		expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
	});
});
