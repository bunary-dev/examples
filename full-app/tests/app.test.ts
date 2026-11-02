/**
 * The wiring: one @bunary/core Application whose providers bind the router,
 * the database, the models and the auth manager, served over a real socket.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AuthToken } from "@bunary/auth/provider";
import type { BunaryServer } from "@bunary/http";
import { RouterToken, serve } from "@bunary/http/provider";
import { DatabaseToken } from "@bunary/orm/provider";
import { ModelsToken } from "../src/models.js";
import { ada, bootTestApp, call, type JsonResponse, type TestApp } from "./helpers.js";

describe("createFullApp", () => {
	let t: TestApp;
	let server: BunaryServer;

	beforeAll(async () => {
		t = await bootTestApp();
		server = serve(t.app, { port: 0 });
	});

	afterAll(() => {
		server?.stop();
		t?.cleanup();
	});

	it("boots with the config from defineConfig", () => {
		expect(t.app.booted).toBe(true);
		expect(t.app.config.get("app.name")).toBe("full-app");
		expect(t.app.config.get("database")).toEqual({ dialect: "sqlite", path: t.databasePath });
		expect(t.app.config.get("auth.defaultGuard")).toBe("jwt");
	});

	it("binds the router under RouterToken", () => {
		expect(t.app.get(RouterToken) as unknown).toBe(t.router);
	});

	it("binds the Drizzle database under DatabaseToken, and models built on it", () => {
		const db = t.app.get(DatabaseToken);
		const models = t.app.get(ModelsToken);

		expect(models.User.db as unknown).toBe(db);
		expect(models.Note.db as unknown).toBe(db);
	});

	it("binds the auth manager under AuthToken, with the orm-backed user provider", () => {
		const manager = t.app.get(AuthToken);

		expect(manager.guard().name).toBe("jwt");
		expect(typeof manager.provider().retrieveByCredentials).toBe("function");
	});

	it("lists the endpoints on GET /", async () => {
		const response = await call(t.router, "GET", "/");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.endpoints).toContain("POST /register");
		expect(body.endpoints).toContain("PATCH /notes/:id");
	});

	it("registers, logs in and creates a note over HTTP", async () => {
		const base = `http://localhost:${server.port}`;
		const post = (path: string, body: unknown, token?: string): Promise<JsonResponse> =>
			fetch(`${base}${path}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
				body: JSON.stringify(body),
			});

		expect((await post("/register", ada)).status).toBe(201);
		const { token } = await (await post("/login", { email: ada.email, password: ada.password })).json();
		const created = await post("/notes", { title: "Over the wire" }, token);

		expect(created.status).toBe(201);
		expect((await created.json()).note.title).toBe("Over the wire");
	});
});

describe("cors()", () => {
	let t: TestApp;

	beforeAll(async () => {
		t = await bootTestApp();
	});

	afterAll(() => t?.cleanup());

	it("answers a preflight for a note", async () => {
		const response = await call(t.router, "OPTIONS", "/notes/1", {
			headers: {
				Origin: "https://notes.example",
				"Access-Control-Request-Method": "PATCH",
				"Access-Control-Request-Headers": "authorization, content-type",
			},
		});

		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(response.headers.get("Access-Control-Allow-Methods")).toContain("PATCH");
		expect(response.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
	});

	it("adds CORS headers to actual responses, including 401s", async () => {
		const response = await call(t.router, "GET", "/notes", { headers: { Origin: "https://notes.example" } });

		expect(response.status).toBe(401);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});
});

describe("imports", () => {
	const files = readdirSync(join(import.meta.dir, "../src"), { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".ts"))
		.map((file) => join(import.meta.dir, "../src", file));

	it("use only the packages' public entry points, never their internals", () => {
		const specifiers = files.flatMap((file) =>
			[...readFileSync(file, "utf8").matchAll(/from "(@bunary\/[^"]+)"/g)].map((m) => m[1]),
		);

		expect(specifiers.length).toBeGreaterThan(0);
		for (const specifier of specifiers) {
			expect(specifier).toMatch(/^@bunary\/(core|http|orm|auth)(\/provider)?$/);
		}
	});
});
