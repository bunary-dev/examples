/**
 * The example's bootstrap: a @bunary/core Application with authProvider and
 * the router mounted through httpProvider, served over a real socket.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { AuthToken } from "@bunary/auth/provider";
import type { Application } from "@bunary/core";
import type { BunaryServer } from "@bunary/http";
import { RouterToken, serve } from "@bunary/http/provider";
import type { ExampleRouter } from "../src/app.js";
import { bootTestApp, call, type JsonResponse } from "./helpers.js";

describe("createExampleApp", () => {
	let app: Application;
	let router: ExampleRouter;
	let server: BunaryServer;

	beforeAll(async () => {
		({ app, router } = await bootTestApp());
		server = serve(app, { port: 0 });
	});

	afterAll(() => {
		server?.stop();
	});

	it("boots with the example's config", () => {
		expect(app.booted).toBe(true);
		expect(app.config.get("app.name")).toBe("auth-example");
		expect(app.config.get("auth.defaultGuard")).toBe("jwt");
	});

	it("binds the auth manager with both guards", () => {
		const manager = app.get(AuthToken);

		expect(manager.guard().name).toBe("jwt");
		expect(manager.guard("jwt").name).toBe("jwt");
		expect(manager.guard("session").name).toBe("session");
	});

	it("binds the router", () => {
		expect(app.get(RouterToken) as unknown).toBe(router);
	});

	it("lists the endpoints on GET /", async () => {
		const response = await call(router, "GET", "/");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(body.endpoints).toContain("POST /login");
		expect(body.endpoints).toContain("GET /session/me");
	});

	it("logs in with a token and reads /me over HTTP", async () => {
		const base = `http://localhost:${server.port}`;
		const login: JsonResponse = await fetch(`${base}/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "ada@example.com", password: "correct horse" }),
		});
		const { token } = await login.json();

		const me: JsonResponse = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });

		expect(me.status).toBe(200);
		expect((await me.json()).user.email).toBe("ada@example.com");
	});
});
