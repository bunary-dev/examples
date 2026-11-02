/**
 * The example's bootstrap: a @bunary/core Application with the router mounted
 * through `httpProvider`, served over a real socket.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Application } from "@bunary/core";
import { RouterToken, serve } from "@bunary/http/provider";
import type { BunaryServer } from "@bunary/http";
import { createExampleApp } from "../src/app.js";
import type { JsonResponse } from "./helpers.js";
import { buildRouter } from "../src/router.js";

describe("createExampleApp", () => {
	let app: Application;
	let server: BunaryServer;

	beforeAll(async () => {
		app = await createExampleApp(buildRouter()).boot();
		server = serve(app, { port: 0 });
	});

	afterAll(() => {
		server?.stop();
	});

	it("boots with the example's config", () => {
		expect(app.booted).toBe(true);
		expect(app.config.get("app.name")).toBe("nested-routes-example");
		expect(app.config.get("http.port")).toBe(3000);
	});

	it("binds the router", () => {
		expect(app.get(RouterToken).hasRoute("api.users.posts.index")).toBe(true);
	});

	it("serves the nested routes over HTTP", async () => {
		const response: JsonResponse = await fetch(`http://localhost:${server.port}/api/users/1/posts`);

		expect(response.status).toBe(200);
		expect((await response.json()).posts).toHaveLength(2);
	});
});
