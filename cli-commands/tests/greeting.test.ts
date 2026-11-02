/**
 * `formatGreeting` is pure: it gets the date passed in, so these tests use a
 * fixed instant instead of the real clock.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { formatGreeting } from "../src/greeting.js";

// Tuesday 3 November 2026, 14:05:09 in Sydney (AEDT, UTC+11).
const fixed = new Date("2026-11-03T03:05:09Z");

describe("formatGreeting", () => {
	let previousTz: string | undefined;

	beforeAll(() => {
		previousTz = process.env.TZ;
		process.env.TZ = "Australia/Sydney";
	});

	afterAll(() => {
		if (previousTz === undefined) delete process.env.TZ;
		else process.env.TZ = previousTz;
	});

	it("greets the given name", () => {
		expect(formatGreeting("Paul", fixed).split("\n")[0]).toBe("Hello, Paul!");
	});

	it("greets the world when no name is given", () => {
		expect(formatGreeting(undefined, fixed).split("\n")[0]).toBe("Hello, world!");
		expect(formatGreeting("", fixed).split("\n")[0]).toBe("Hello, world!");
	});

	it("formats the date and time in the local zone", () => {
		expect(formatGreeting("Paul", fixed)).toBe(
			"Hello, Paul!\nIt's Tuesday, 3 November 2026, 14:05:09 AEDT",
		);
	});

	it("follows the local zone it runs in", () => {
		process.env.TZ = "America/New_York";
		try {
			expect(formatGreeting("Paul", fixed)).toBe(
				"Hello, Paul!\nIt's Monday, 2 November 2026, 22:05:09 GMT-5",
			);
		} finally {
			process.env.TZ = "Australia/Sydney";
		}
	});

	it("uses UTC with { utc: true }", () => {
		expect(formatGreeting("Paul", fixed, { utc: true })).toBe(
			"Hello, Paul!\nIt's Tuesday, 3 November 2026, 03:05:09 UTC",
		);
	});
});
