# cli-commands

A custom project command for the [Bunary CLI](https://github.com/bunary-dev/cli): `bunary hello`,
scaffolded with `bunary make:command`, registered in `config/bunary.ts` and run from this folder
with `bunx bunary hello`.

Uses the published `@bunary/core` ^0.4.0 (for the `Command` type and `defineConfig`), with
`@bunary/cli` ^0.4.6 as a devDependency so `bunx bunary` runs the locally installed cli.

```bash
bun install
bunx bunary hello Paul
# Hello, Paul!
# It's Tuesday, 3 November 2026, 14:05:09 AEDT

bunx bunary hello            # Hello, world!
bunx bunary hello Paul --utc # the time in UTC instead of the local zone
bunx bunary --help           # lists hello under "Project"
```

## How it was built

### 1. Scaffold the command

```bash
bunx bunary make:command hello
```

That created `src/commands/hello.ts` from the cli's stub, exporting `helloCommand` typed with
`Command` from `@bunary/core`:

```ts
export const helloCommand: Command = {
	name: "hello",
	description: "Describe what hello does",
	usage: "bunary hello",
	category: "project",
	async run(args, flags) {
		console.log("hello", args, flags);
	},
};
```

### 2. Fill it in

[`src/commands/hello.ts`](./src/commands/hello.ts) declares an optional `name` argument and a
`--utc` flag. A flag without a value placeholder in its name is a boolean switch, so
`flags.utc` is `true` when given (and `--utc=yes` is rejected by the cli):

```ts
args: [{ name: "name", required: false, description: "Who to greet (default: world)" }],
flags: [{ name: "utc", description: "Show the time in UTC instead of the local zone" }],
async run(args, flags) {
	console.log(formatGreeting(args[0], new Date(), { utc: flags.utc === true }));
},
```

The formatting lives in [`src/greeting.ts`](./src/greeting.ts):
`formatGreeting(name, date, { utc })` is a pure function over `Intl.DateTimeFormat` (no date
library; `en-AU`, 24-hour clock, short zone name such as `AEDT` or `UTC`). It takes the date as an
argument, so it is tested with a fixed `Date` instead of the real clock.

### 3. Register it

[`config/bunary.ts`](./config/bunary.ts) (the cli looks there first, then `bunary.config.ts`):

```ts
import { defineConfig } from "@bunary/core";
import { helloCommand } from "../src/commands/hello.js";

export default defineConfig({
	app: { name: "cli-commands" },
	commands: [helloCommand],
});
```

Now `bunary hello` works from this folder and `bunary --help` shows it under "Project".

## Tests

```bash
bun test
bunx tsc --noEmit
```

- `tests/greeting.test.ts`: `formatGreeting` with a fixed `Date`: default name, a given name,
  local zone formatting (with `TZ` pinned) and `{ utc: true }`.
- `tests/hello.test.ts`: the command object and its registration in `config/bunary.ts`.
- `tests/cli.test.ts`: end to end, spawns the installed `bunary` in this folder: `bunary hello Paul`,
  `bunary hello`, `bunary hello --utc` and `bunary --help`.
