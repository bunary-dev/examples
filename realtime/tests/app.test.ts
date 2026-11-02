/**
 * The example's bootstrap: a @bunary/core Application with the router
 * mounted through httpProvider.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { RouterToken } from "@bunary/http/provider";
import { startTestServer, type TestServer } from "./helpers.js";

describe("createExampleApp", () => {
	let t: TestServer;

	beforeAll(async () => {
		t = await startTestServer();
	});

	afterAll(() => {
		t?.server.stop();
	});

	it("boots with the example's config", () => {
		expect(t.app.booted).toBe(true);
		expect(t.app.config.get("app.name")).toBe("realtime-example");
	});

	it("binds the router", () => {
		expect(t.app.get(RouterToken) as unknown).toBe(t.router);
	});

	it("registers the chat and event routes", () => {
		const paths = t.router.getRoutes().map((r) => `${r.method} ${r.path}`);
		expect(paths).toContain("GET /");
		expect(paths).toContain("GET /events");
		expect(paths.some((p) => p.endsWith(" /chat/:room"))).toBe(true);
	});

	it("lists the endpoints on GET /", async () => {
		const response = await fetch(`${t.http}/`);
		const body = (await response.json()) as { status: string; endpoints: string[] };

		expect(response.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(body.endpoints).toEqual(["WS /chat/:room", "GET /events"]);
	});
});
