/**
 * Basic API Example Tests
 *
 * Boots the example's real application (src/app.ts) and serves it on an
 * ephemeral port, so every request below exercises the routes, middleware
 * and config the example ships.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Application } from "@bunary/core";
import type { BunaryServer } from "@bunary/http";
import { RouterToken, serve } from "@bunary/http/provider";
import { createBasicApi, router } from "../src/app";

describe("Basic API Example", () => {
	let app: Application;
	let server: BunaryServer;
	let baseUrl: string;

	beforeAll(async () => {
		app = await createBasicApi();
		server = serve(app, { port: 0 });
		baseUrl = `http://localhost:${server.port}`;
	});

	afterAll(() => {
		server?.stop();
	});

	describe("Application", () => {
		it("boots with the config from bunary.config.ts", () => {
			expect(app.booted).toBe(true);
			expect(app.config.get("app.name")).toBe("basic-api");
		});

		it("mounts the example router via httpProvider", () => {
			expect(app.get(RouterToken)).toBe(router);
		});

		it("registers exactly the documented routes", () => {
			const routes = router
				.getRoutes()
				.map((r) => `${r.method} ${r.path}`)
				.sort();
			expect(routes).toEqual(
				[
					"GET /",
					"GET /health",
					"GET /users/:id",
					"GET /users/:userId/posts/:postId",
					"GET /items",
					"POST /resources",
					"PUT /resources/:id",
					"DELETE /resources/:id",
				].sort(),
			);
		});
	});

	describe("GET /", () => {
		it("should return welcome message with environment info", async () => {
			const response = await fetch(`${baseUrl}/`);
			const data = (await response.json()) as {
				message: string;
				app: string;
				environment: string;
				docs: string;
			};

			expect(response.status).toBe(200);
			expect(data.message).toBe("Welcome to Bunary!");
			expect(data.app).toBe("basic-api");
			expect(["development", "production"]).toContain(data.environment);
			expect(data.docs).toBe("/docs");
		});
	});

	describe("GET /health", () => {
		it("should return health status with timestamp", async () => {
			const response = await fetch(`${baseUrl}/health`);
			const data = (await response.json()) as {
				status: string;
				timestamp: string;
			};

			expect(response.status).toBe(200);
			expect(data.status).toBe("healthy");
			expect(data.timestamp).toBeDefined();
			expect(typeof data.timestamp).toBe("string");
			// Verify timestamp is valid ISO string
			expect(() => new Date(data.timestamp)).not.toThrow();
		});
	});

	describe("GET /users/:id", () => {
		it("should extract path parameter and return user data", async () => {
			const userId = "123";
			const response = await fetch(`${baseUrl}/users/${userId}`);
			const data = (await response.json()) as {
				id: string;
				name: string;
				email: string;
			};

			expect(response.status).toBe(200);
			expect(data.id).toBe(userId);
			expect(data.name).toBe(`User ${userId}`);
			expect(data.email).toBe(`user${userId}@example.com`);
		});

		it("should handle different user IDs", async () => {
			const userId = "456";
			const response = await fetch(`${baseUrl}/users/${userId}`);
			const data = (await response.json()) as {
				id: string;
				email: string;
			};

			expect(response.status).toBe(200);
			expect(data.id).toBe(userId);
			expect(data.email).toBe(`user${userId}@example.com`);
		});
	});

	describe("GET /users/:userId/posts/:postId", () => {
		it("should extract multiple path parameters", async () => {
			const userId = "1";
			const postId = "42";
			const response = await fetch(`${baseUrl}/users/${userId}/posts/${postId}`);
			const data = (await response.json()) as {
				userId: string;
				postId: string;
				title: string;
				content: string;
			};

			expect(response.status).toBe(200);
			expect(data.userId).toBe(userId);
			expect(data.postId).toBe(postId);
			expect(data.title).toBe(`Post ${postId} by User ${userId}`);
			expect(data.content).toBe("This is a sample post content.");
		});
	});

	describe("GET /items", () => {
		it("should handle query parameters with defaults", async () => {
			const response = await fetch(`${baseUrl}/items`);
			const data = (await response.json()) as {
				page: number;
				limit: number;
				search: string | null;
				total: number;
				items: Array<{ id: number; name: string }>;
			};

			expect(response.status).toBe(200);
			expect(data.page).toBe(1);
			expect(data.limit).toBe(10);
			expect(data.search).toBeNull();
			expect(data.total).toBe(100);
			expect(data.items).toHaveLength(10);
		});

		it("should parse page and limit query parameters", async () => {
			const response = await fetch(`${baseUrl}/items?page=2&limit=5`);
			const data = (await response.json()) as {
				page: number;
				limit: number;
				items: Array<{ id: number }>;
			};

			expect(response.status).toBe(200);
			expect(data.page).toBe(2);
			expect(data.limit).toBe(5);
			expect(data.items).toHaveLength(5);
			// First item should be item 6 (page 2, limit 5: (2-1)*5 + 1 = 6)
			expect(data.items[0].id).toBe(6);
		});

		it("should handle search query parameter", async () => {
			const response = await fetch(`${baseUrl}/items?search=test`);
			const data = (await response.json()) as {
				search: string | null;
			};

			expect(response.status).toBe(200);
			expect(data.search).toBe("test");
		});

		it("should return null for empty search parameter", async () => {
			const response = await fetch(`${baseUrl}/items?search=`);
			const data = (await response.json()) as {
				search: string | null;
			};

			expect(response.status).toBe(200);
			expect(data.search).toBeNull();
		});
	});

	describe("POST /resources", () => {
		it("should create a resource with JSON body", async () => {
			const body = {
				name: "My Resource",
				type: "example",
			};

			const response = await fetch(`${baseUrl}/resources`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			expect(response.status).toBe(201);
			expect(response.headers.get("Content-Type")).toContain("application/json");

			const data = (await response.json()) as {
				id: string;
				name: string;
				type: string;
				createdAt: string;
			};
			expect(data.id).toBeDefined();
			expect(typeof data.id).toBe("string");
			expect(data.name).toBe(body.name);
			expect(data.type).toBe(body.type);
			expect(data.createdAt).toBeDefined();
			expect(typeof data.createdAt).toBe("string");
		});

		it("should generate unique IDs for each resource", async () => {
			const body = { name: "Resource 1" };
			const response1 = await fetch(`${baseUrl}/resources`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const response2 = await fetch(`${baseUrl}/resources`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data1 = (await response1.json()) as { id: string };
			const data2 = (await response2.json()) as { id: string };

			expect(data1.id).not.toBe(data2.id);
		});
	});

	describe("PUT /resources/:id", () => {
		it("should update a resource with JSON body", async () => {
			const resourceId = "abc123";
			const body = {
				name: "Updated Resource",
				value: 42,
			};

			const response = await fetch(`${baseUrl}/resources/${resourceId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as {
				id: string;
				name: string;
				value: number;
				updatedAt: string;
			};
			expect(data.id).toBe(resourceId);
			expect(data.name).toBe(body.name);
			expect(data.value).toBe(body.value);
			expect(data.updatedAt).toBeDefined();
			expect(typeof data.updatedAt).toBe("string");
		});
	});

	describe("DELETE /resources/:id", () => {
		it("should delete a resource and return confirmation", async () => {
			const resourceId = "xyz789";
			const response = await fetch(`${baseUrl}/resources/${resourceId}`, {
				method: "DELETE",
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as {
				message: string;
				deletedAt: string;
			};
			expect(data.message).toBe(`Resource ${resourceId} deleted`);
			expect(data.deletedAt).toBeDefined();
			expect(typeof data.deletedAt).toBe("string");
		});
	});

	describe("Middleware", () => {
		it("should execute logging middleware for all requests", async () => {
			// This test verifies middleware runs (we can't easily test console.log,
			// but we can verify the request completes successfully)
			const response = await fetch(`${baseUrl}/health`);
			expect(response.status).toBe(200);
			// If middleware throws, request would fail
		});
	});

	describe("Error Handling", () => {
		it("should return 404 for non-existent routes", async () => {
			const response = await fetch(`${baseUrl}/nonexistent`);
			expect(response.status).toBe(404);
		});

		it("should return 405 for unsupported methods on existing routes", async () => {
			// Try PATCH on a GET-only route
			const response = await fetch(`${baseUrl}/health`, {
				method: "PATCH",
			});
			expect(response.status).toBe(405);
		});
	});
});
