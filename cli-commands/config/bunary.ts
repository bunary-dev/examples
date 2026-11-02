import { defineConfig } from "@bunary/core";
import { helloCommand } from "../src/commands/hello.js";

export default defineConfig({
	app: { name: "cli-commands" },
	commands: [helloCommand],
});
