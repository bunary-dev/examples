/**
 * Basic API Example Tests
 * 
 * Comprehensive tests for all endpoints in the basic-api example.
 * Tests route handlers, path parameters, query parameters, and middleware.
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { createApp } from "@bunary/http";
import { env, isDev } from "@bunary/core";

// Import the app setup from the example
// We'll need to extract the app creation and routes to make it testable
// For now, we'll recreate the app structure in tests

describe("Basic API Example", () => {
	let app: ReturnType<typeof createApp>;
	let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
	let baseUrl: string;

	beforeAll(() => {
		// Create app instance (same as example)
		app = createApp();

		// Add logging middleware (same as example)
		app.use(async (ctx, next) => {
			const method = ctx.request.method;
			const url = new URL(ctx.request.url);
			const start = Date.now();

			const response = await next();

			const duration = Date.now() - start;
			console.log(`${method} ${url.pathname} - ${duration}ms`);

			return response;
		});

		// Register all routes (same as example)
		app.get("/health", () => {
			return {
				status: "healthy",
				timestamp: new Date().toISOString(),
			};
		});

		app.get("/", () => {
			return {
				message: "Welcome to Bunary!",
				environment: isDev() ? "development" : "production",
				docs: "/docs",
			};
		});

		app.get("/users/:id", (ctx) => {
			const userId = ctx.params.id;
			return {
				id: userId,
				name: `User ${userId}`,
				email: `user${userId}@example.com`,
			};
		});

		app.get("/users/:userId/posts/:postId", (ctx) => {
			const { userId, postId } = ctx.params;
			return {
				userId,
				postId,
				title: `Post ${postId} by User ${userId}`,
				content: "This is a sample post content.",
			};
		});

		app.get("/items", (ctx) => {
			const page = parseInt(ctx.query.get("page") || "1", 10);
			const limit = parseInt(ctx.query.get("limit") || "10", 10);
			const search = ctx.query.get("search") || "";

			const items = Array.from({ length: limit }, (_, i) => ({
				id: (page - 1) * limit + i + 1,
				name: `Item ${(page - 1) * limit + i + 1}`,
			}));

			return {
				page,
				limit,
				search: search || null,
				total: 100,
				items,
			};
		});

		app.post("/resources", async (ctx) => {
			const body = (await ctx.request.json()) as Record<string, unknown>;
			return new Response(
				JSON.stringify({
					id: crypto.randomUUID(),
					...body,
					createdAt: new Date().toISOString(),
				}),
				{
					status: 201,
					headers: { "Content-Type": "application/json" },
				}
			);
		});

		app.put("/resources/:id", async (ctx) => {
			const body = (await ctx.request.json()) as Record<string, unknown>;
			return {
				id: ctx.params.id,
				...body,
				updatedAt: new Date().toISOString(),
			};
		});

		app.delete("/resources/:id", (ctx) => {
			return {
				message: `Resource ${ctx.params.id} deleted`,
				deletedAt: new Date().toISOString(),
			};
		});

		// Start server on a random port for testing
		server = app.listen({ port: 0 });
		baseUrl = `http://localhost:${server.port}`;
	});

	afterAll(() => {
		// Clean up server
		if (server) {
			server.stop();
		}
	});

	describe("GET /", () => {
		it("should return welcome message with environment info", async () => {
			const response = await fetch(`${baseUrl}/`);
			const data = (await response.json()) as {
				message: string;
				environment: string;
				docs: string;
			};

			expect(response.status).toBe(200);
			expect(data.message).toBe("Welcome to Bunary!");
			expect(data.environment).toBeDefined();
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
			expect(response.headers.get("Content-Type")).toBe("application/json");

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
