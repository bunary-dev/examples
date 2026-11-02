/**
 * bunary.config.ts tests
 */

import { describe, expect, it } from "bun:test";
import config from "../bunary.config";

describe("bunary.config.ts", () => {
	it("names the app", () => {
		expect(config.app?.name).toBe("basic-api");
	});

	it("takes the HTTP port from PORT, defaulting to 3000", () => {
		const expected = Bun.env.PORT ? Number(Bun.env.PORT) : 3000;
		expect(config.http?.port).toBe(expected);
	});
});
