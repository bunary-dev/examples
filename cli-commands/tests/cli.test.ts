/**
 * End to end: the installed `bunary` binary (@bunary/cli, a devDependency)
 * run in this folder picks up the command from config/bunary.ts.
 */

import { describe, expect, it } from "bun:test";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const bin = join(root, "node_modules", ".bin", "bunary");

function bunary(...args: string[]) {
	const proc = Bun.spawnSync([bin, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	return { exitCode: proc.exitCode, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() };
}

describe("bunary (installed cli)", () => {
	it("bunary hello Paul greets Paul with the current date", () => {
		const { exitCode, stdout, stderr } = bunary("hello", "Paul");
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);
		const [greeting, when] = stdout.trim().split("\n");
		expect(greeting).toBe("Hello, Paul!");
		expect(when).toStartWith("It's ");
		expect(when).toContain(String(new Date().getFullYear()));
	});

	it("bunary hello greets the world", () => {
		const { exitCode, stdout } = bunary("hello");
		expect(exitCode).toBe(0);
		expect(stdout).toStartWith("Hello, world!\n");
	});

	it("bunary hello --utc prints the time in UTC", () => {
		const { exitCode, stdout } = bunary("hello", "Paul", "--utc");
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toEndWith(" UTC");
	});

	it("bunary --help lists hello under Project", () => {
		const { exitCode, stdout } = bunary("--help");
		expect(exitCode).toBe(0);
		const project = stdout.slice(stdout.search(/^\s*Project\b/m));
		expect(project).not.toBe(stdout);
		expect(project.split(/\n\s*\n/)[0]).toMatch(/^\s+hello\s+/m);
	});
});
