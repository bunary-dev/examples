/**
 * Route table of the nested-routes example: groups, nested prefixes, named
 * routes and basePath.
 */

import { describe, expect, it } from "bun:test";
import type { RouteInfo } from "@bunary/http";
import { buildRouter } from "../src/router.js";
import { call } from "./helpers.js";

/** Every route the example defines, as `getRoutes()` reports it. */
const ROUTES: RouteInfo[] = [
	{ name: "health", method: "GET", path: "/" },
	{ name: "api.users.index", method: "GET", path: "/api/users" },
	{ name: "api.users.store", method: "POST", path: "/api/users" },
	{ name: "api.users.show", method: "GET", path: "/api/users/:id" },
	{ name: "api.users.destroy", method: "DELETE", path: "/api/users/:id" },
	{ name: "api.users.posts.index", method: "GET", path: "/api/users/:userId/posts" },
	{ name: "api.posts.index", method: "GET", path: "/api/posts" },
	{ name: "api.posts.store", method: "POST", path: "/api/posts" },
	{ name: "api.posts.show", method: "GET", path: "/api/posts/:id" },
];

describe("route groups", () => {
	it("registers every route under its group prefix and name prefix", () => {
		const routes = buildRouter().getRoutes();

		expect(routes).toHaveLength(ROUTES.length);
		for (const route of ROUTES) {
			expect(routes).toContainEqual(route);
		}
	});

	it("names every route", () => {
		const router = buildRouter();

		for (const route of router.getRoutes()) {
			expect(route.name).not.toBeNull();
			expect(router.hasRoute(route.name as string)).toBe(true);
		}
	});
});

describe("named routes", () => {
	const router = buildRouter();
	const cases: [string, Record<string, string | number> | undefined, string][] = [
		["health", undefined, "/"],
		["api.users.index", undefined, "/api/users"],
		["api.users.store", undefined, "/api/users"],
		["api.users.show", { id: 1 }, "/api/users/1"],
		["api.users.destroy", { id: 2 }, "/api/users/2"],
		["api.users.posts.index", { userId: 1 }, "/api/users/1/posts"],
		["api.posts.index", undefined, "/api/posts"],
		["api.posts.index", { authorId: 1 }, "/api/posts?authorId=1"],
		["api.posts.store", undefined, "/api/posts"],
		["api.posts.show", { id: 3 }, "/api/posts/3"],
	];

	for (const [name, params, url] of cases) {
		it(`route("${name}"${params ? `, ${JSON.stringify(params)}` : ""}) is ${url}`, () => {
			expect(router.route(name, params)).toBe(url);
		});
	}

	it("generated URLs resolve to their routes", async () => {
		const fresh = buildRouter();
		const show = await call(fresh, "GET", fresh.route("api.users.show", { id: 1 }));
		const nested = await call(fresh, "GET", fresh.route("api.users.posts.index", { userId: 2 }));

		expect((await show.json()).user.name).toBe("Alice");
		expect((await nested.json()).posts).toHaveLength(1);
	});

	it("throws for a missing required parameter", () => {
		expect(() => router.route("api.users.show")).toThrow();
	});

	it("throws for an unknown name", () => {
		expect(() => router.route("api.comments.index")).toThrow();
		expect(router.hasRoute("api.comments.index")).toBe(false);
	});
});

describe("basePath", () => {
	const router = buildRouter({ basePath: "/v1" });

	it("prefixes every route", () => {
		expect(router.getRoutes().map((r) => r.path)).toEqual(
			buildRouter()
				.getRoutes()
				.map((r) => (r.path === "/" ? "/v1" : `/v1${r.path}`)),
		);
	});

	it("serves the groups under the base path only", async () => {
		expect((await call(router, "GET", "/v1/api/users/1/posts")).status).toBe(200);
		expect((await call(router, "GET", "/api/users")).status).toBe(404);
	});

	it("includes the base path in generated URLs", async () => {
		expect(router.route("api.users.show", { id: 1 })).toBe("/v1/api/users/1");

		const health = await (await call(router, "GET", "/v1")).json();
		expect(health.endpoints).toEqual(["/v1/api/users", "/v1/api/posts"]);
	});
});
