import type { Command } from "@bunary/core";
import { formatGreeting } from "../greeting.js";

/**
 * `bunary hello [name] [--utc]`: greets `name` (default `world`) with the
 * current date and time. Scaffolded by `bunary make:command hello`.
 *
 * @example
 * ```ts
 * // config/bunary.ts
 * import { helloCommand } from "../src/commands/hello.js";
 *
 * export default defineConfig({
 *   app: { name: "cli-commands" },
 *   commands: [helloCommand],
 * });
 * ```
 */
export const helloCommand: Command = {
	name: "hello",
	description: "Greet someone with the current date and time",
	usage: "bunary hello [name] [--utc]",
	category: "project",
	args: [{ name: "name", required: false, description: "Who to greet (default: world)" }],
	flags: [{ name: "utc", description: "Show the time in UTC instead of the local zone" }],
	async run(args, flags) {
		console.log(formatGreeting(args[0], new Date(), { utc: flags.utc === true }));
	},
};
