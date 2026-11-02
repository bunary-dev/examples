/**
 * Config from the environment (`env()`), and `db:setup`'s migrations.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_DATABASE_PATH, DEV_JWT_SECRET, loadOptions } from "../src/config.js";
import { setupDatabase } from "../src/db/setup.js";

const VARS = ["DATABASE_PATH", "JWT_SECRET", "APP_ENV", "NODE_ENV"] as const;

describe("loadOptions", () => {
	let saved: Record<string, string | undefined>;

	beforeEach(() => {
		saved = Object.fromEntries(VARS.map((name) => [name, Bun.env[name]]));
		for (const name of VARS) delete Bun.env[name];
	});

	afterEach(() => {
		for (const name of VARS) {
			if (saved[name] === undefined) delete Bun.env[name];
			else Bun.env[name] = saved[name];
		}
	});

	it("falls back to the dev defaults outside production", () => {
		expect(loadOptions()).toEqual({ databasePath: DEFAULT_DATABASE_PATH, jwtSecret: DEV_JWT_SECRET });
	});

	it("reads DATABASE_PATH and JWT_SECRET", () => {
		Bun.env.DATABASE_PATH = "/tmp/notes.sqlite";
		Bun.env.JWT_SECRET = "from-the-environment";

		expect(loadOptions()).toEqual({ databasePath: "/tmp/notes.sqlite", jwtSecret: "from-the-environment" });
	});

	it("refuses the dev JWT secret in production", () => {
		Bun.env.APP_ENV = "production";

		expect(() => loadOptions()).toThrow("JWT_SECRET must be set in production");
		Bun.env.JWT_SECRET = "a-real-secret";
		expect(loadOptions().jwtSecret).toBe("a-real-secret");
	});
});

describe("setupDatabase", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "bunary-full-app-setup-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("applies the migrations, and is safe to re-run on an existing database", async () => {
		const path = join(dir, "app.sqlite");

		const first = await setupDatabase(path);
		first.$client.exec("INSERT INTO users (name, email, password, created_at) VALUES ('Ada', 'ada@example.com', 'x', 0)");
		first.$client.close();

		const second = await setupDatabase(path);
		const tables = second.$client
			.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite_%' ORDER BY name")
			.all()
			.map((row) => row.name);
		const users = second.$client.query<{ n: number }, []>("SELECT count(*) AS n FROM users").get();
		second.$client.close();

		expect(tables).toEqual(["notes", "users"]);
		expect(users?.n).toBe(1);
	});
});
