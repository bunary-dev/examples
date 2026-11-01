/**
 * Demo smoke test: the example's main script runs end to end against an
 * in-memory database without throwing.
 */

import { describe, expect, it, spyOn } from "bun:test";
import { runExample } from "../src/index.js";

describe("runExample", () => {
	it("runs every demo step against an in-memory database", async () => {
		const log = spyOn(console, "log").mockImplementation(() => {});
		try {
			await runExample(":memory:");
			const output = log.mock.calls.map((args) => args.join(" ")).join("\n");
			expect(output).toContain("All examples completed successfully");
		} finally {
			log.mockRestore();
		}
	});
});
