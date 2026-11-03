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

	it("depends only on @bunary/core ^0.4.0 and @bunary/http ^0.7.2 from npm", () => {
		expect(pkg.dependencies).toEqual({
			"@bunary/core": "^0.4.0",
			"@bunary/http": "^0.7.2",
		});
	});
});
