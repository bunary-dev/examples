/**
 * The command object itself, run in-process with console.log captured.
 */

import { describe, expect, it, spyOn } from "bun:test";
import config from "../config/bunary.js";
import { helloCommand } from "../src/commands/hello.js";

async function run(args: string[], flags: Record<string, string | boolean> = {}): Promise<string> {
	const log = spyOn(console, "log").mockImplementation(() => {});
	try {
		await helloCommand.run(args, flags);
		return log.mock.calls.map((call) => call.join(" ")).join("\n");
	} finally {
		log.mockRestore();
	}
}

describe("helloCommand", () => {
	it("is a project command named hello with an optional name and a --utc switch", () => {
		expect(helloCommand.name).toBe("hello");
		expect(helloCommand.category).toBe("project");
		expect(helloCommand.args).toEqual([expect.objectContaining({ name: "name", required: false })]);
		expect(helloCommand.flags).toEqual([expect.objectContaining({ name: "utc" })]);
	});

	it("is registered in config/bunary.ts", () => {
		expect(config.app?.name).toBe("cli-commands");
		expect(config.commands).toEqual([helloCommand]);
	});

	it("prints the greeting for the given name", async () => {
		const out = await run(["Paul"]);
		expect(out).toStartWith("Hello, Paul!\nIt's ");
		expect(out).toContain(String(new Date().getFullYear()));
	});

	it("defaults to world", async () => {
		expect(await run([])).toStartWith("Hello, world!\n");
	});

	it("prints UTC with --utc", async () => {
		expect(await run(["Paul"], { utc: true })).toEndWith(" UTC");
	});
});
