/**
 * Test helpers: boot the full app against a fresh, migrated SQLite file in a
 * temp directory, and send requests straight to its router.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Application } from "@bunary/core";
import { DatabaseToken } from "@bunary/orm/provider";
import { createFullApp, type FullAppRouter } from "../src/app.js";
import type { AppDatabase } from "../src/db/database.js";
import { setupDatabase } from "../src/db/setup.js";

/** A Response whose JSON body the tests read loosely. */
// biome-ignore lint/suspicious/noExplicitAny: test assertions inspect arbitrary JSON
export type JsonResponse = Omit<Response, "json"> & { json(): Promise<any> };

export const TEST_JWT_SECRET = "test-jwt-secret-not-used-anywhere-else";

export interface TestApp {
	app: Application;
	router: FullAppRouter;
	databasePath: string;
	/** Close the database and delete the temp directory. */
	cleanup(): void;
}

/** Migrate a temp SQLite database and boot the full app on it. */
export async function bootTestApp(): Promise<TestApp> {
	const dir = mkdtempSync(join(tmpdir(), "bunary-full-app-"));
	const databasePath = join(dir, "test.sqlite");
	(await setupDatabase(databasePath)).$client.close();

	const { app, router } = createFullApp({ databasePath, jwtSecret: TEST_JWT_SECRET });
	await app.boot();

	return {
		app,
		router,
		databasePath,
		cleanup() {
			(app.get(DatabaseToken) as AppDatabase).$client.close();
			rmSync(dir, { recursive: true, force: true });
		},
	};
}

export interface CallOptions {
	body?: unknown;
	token?: string;
	headers?: Record<string, string>;
}

/** Send a request straight to a router, without starting a server. */
export function call(router: FullAppRouter, method: string, path: string, options: CallOptions = {}): Promise<JsonResponse> {
	const headers = new Headers(options.headers);
	if (options.body !== undefined) headers.set("Content-Type", "application/json");
	if (options.token !== undefined) headers.set("Authorization", `Bearer ${options.token}`);
	return router.fetch(
		new Request(`http://localhost${path}`, {
			method,
			headers,
			...(options.body !== undefined && { body: JSON.stringify(options.body) }),
		}),
	);
}

export interface Account {
	name: string;
	email: string;
	password: string;
}

export const ada: Account = { name: "Ada Lovelace", email: "ada@example.com", password: "correct horse" };
export const alan: Account = { name: "Alan Turing", email: "alan@example.com", password: "enigma-1912" };

/** Register `account` and log in; returns the JWT. */
export async function registerAndLogin(router: FullAppRouter, account: Account): Promise<string> {
	const registered = await call(router, "POST", "/register", { body: account });
	if (registered.status !== 201) throw new Error(`register failed: ${registered.status}`);
	const login = await call(router, "POST", "/login", { body: { email: account.email, password: account.password } });
	if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
	return (await login.json()).token;
}
