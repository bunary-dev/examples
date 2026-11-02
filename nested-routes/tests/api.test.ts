/**
 * Endpoint behaviour of the nested-routes example.
 *
 * Each test builds a fresh router (and so a fresh in-memory store), and calls
 * it through `router.fetch` without starting a server.
 */

import { beforeEach, describe, expect, it } from "bun:test";
import type { Router } from "@bunary/http";
import { buildRouter } from "../src/router.js";
import { call } from "./helpers.js";

let router: Router;

beforeEach(() => {
	router = buildRouter();
});

describe("GET /", () => {
	it("returns the health check with the generated endpoint URLs", async () => {
		const response = await call(router, "GET", "/");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "ok",
			message: "Nested Routes Example",
			endpoints: ["/api/users", "/api/posts"],
		});
	});
});

describe("users group (/api/users)", () => {
	it("GET / lists all users", async () => {
		const response = await call(router, "GET", "/api/users");
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.users).toHaveLength(3);
		expect(data.users[0]).toEqual({ id: "1", name: "Alice", email: "alice@example.com" });
	});

	it("GET /:id returns one user", async () => {
		const response = await call(router, "GET", "/api/users/2");

		expect(response.status).toBe(200);
		expect((await response.json()).user.name).toBe("Bob");
	});

	it("GET /:id returns 404 for an unknown user", async () => {
		const response = await call(router, "GET", "/api/users/999");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "User not found" });
	});

	it("POST / creates a user and lists it afterwards", async () => {
		const response = await call(router, "POST", "/api/users", { name: "Dave", email: "dave@example.com" });
		const { user } = await response.json();

		expect(response.status).toBe(201);
		expect(user).toEqual({ id: "4", name: "Dave", email: "dave@example.com" });

		const list = await (await call(router, "GET", "/api/users")).json();
		expect(list.users).toContainEqual(user);
	});

	it("DELETE /:id removes the user", async () => {
		const response = await call(router, "DELETE", "/api/users/3");

		expect(response.status).toBe(200);
		expect((await response.json()).deleted.id).toBe("3");
		expect((await call(router, "GET", "/api/users/3")).status).toBe(404);
	});

	it("DELETE /:id returns 404 for an unknown user", async () => {
		const response = await call(router, "DELETE", "/api/users/999");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "User not found" });
	});

	it("never reuses an id after a delete", async () => {
		await call(router, "DELETE", "/api/users/3");
		const response = await call(router, "POST", "/api/users", { name: "Eve", email: "eve@example.com" });

		expect((await response.json()).user.id).toBe("4");
	});
});

describe("nested user posts group (/api/users/:userId/posts)", () => {
	it("GET / lists the posts of one user", async () => {
		const response = await call(router, "GET", "/api/users/1/posts");
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.user.id).toBe("1");
		expect(data.posts.map((p: { id: string }) => p.id)).toEqual(["1", "2"]);
	});

	it("GET / returns 404 for an unknown user", async () => {
		const response = await call(router, "GET", "/api/users/999/posts");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "User not found" });
	});

	it("includes posts created through the posts group", async () => {
		await call(router, "POST", "/api/posts", { title: "Bob's second post", authorId: "2" });
		const data = await (await call(router, "GET", "/api/users/2/posts")).json();

		expect(data.posts.map((p: { title: string }) => p.title)).toEqual(["TypeScript Tips", "Bob's second post"]);
	});
});

describe("posts group (/api/posts)", () => {
	it("GET / lists all posts", async () => {
		const data = await (await call(router, "GET", "/api/posts")).json();

		expect(data.posts).toHaveLength(3);
	});

	it("GET /?authorId= filters posts by author", async () => {
		const data = await (await call(router, "GET", "/api/posts?authorId=2")).json();

		expect(data.posts).toEqual([{ id: "3", title: "TypeScript Tips", authorId: "2" }]);
	});

	it("GET /:id returns one post", async () => {
		const response = await call(router, "GET", "/api/posts/1");

		expect(response.status).toBe(200);
		expect((await response.json()).post.title).toBe("Hello World");
	});

	it("GET /:id returns 404 for an unknown post", async () => {
		const response = await call(router, "GET", "/api/posts/999");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Post not found" });
	});

	it("POST / creates a post and lists it afterwards", async () => {
		const response = await call(router, "POST", "/api/posts", { title: "New Post", authorId: "1" });
		const { post } = await response.json();

		expect(response.status).toBe(201);
		expect(post).toEqual({ id: "4", title: "New Post", authorId: "1" });

		const list = await (await call(router, "GET", "/api/posts")).json();
		expect(list.posts).toContainEqual(post);
	});
});

describe("unknown routes", () => {
	it("returns 404 outside the defined groups", async () => {
		expect((await call(router, "GET", "/api/nonexistent")).status).toBe(404);
	});

	it("returns 405 for a known path with the wrong method", async () => {
		expect((await call(router, "PATCH", "/api/users")).status).toBe(405);
	});
});
