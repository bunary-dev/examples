/**
 * Nested Routes Example Tests
 * 
 * Comprehensive tests for all endpoints in the nested-routes example.
 * Tests route organization, path parameters, query parameters, and error handling.
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { createApp } from "@bunary/http";
import { registerRoutes } from "../src/routes/index.js";

describe("Nested Routes Example", () => {
	let app: ReturnType<typeof createApp>;
	let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
	let baseUrl: string;

	beforeAll(() => {
		// Create app instance (same as example)
		app = createApp();

		// Health check at root (same as example)
		app.get("/", () => ({
			status: "ok",
			message: "Nested Routes Example",
			endpoints: ["/api/users", "/api/posts"],
		}));

		// Register all API routes from modules (same as example)
		registerRoutes(app);

		// Start server on a random port for testing
		const port = 0; // 0 = random available port
		server = app.listen({ port });
		baseUrl = `http://localhost:${server.port}`;
	});

	afterAll(() => {
		// Clean up server
		if (server) {
			server.stop();
		}
	});

	describe("GET /", () => {
		it("should return health check with status and endpoints", async () => {
			const response = await fetch(`${baseUrl}/`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.status).toBe("ok");
			expect(data.message).toBe("Nested Routes Example");
			expect(data.endpoints).toEqual(["/api/users", "/api/posts"]);
		});
	});

	describe("GET /api/users", () => {
		it("should return list of all users", async () => {
			const response = await fetch(`${baseUrl}/api/users`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.users).toBeDefined();
			expect(Array.isArray(data.users)).toBe(true);
			expect(data.users.length).toBeGreaterThan(0);
			expect(data.users[0]).toHaveProperty("id");
			expect(data.users[0]).toHaveProperty("name");
			expect(data.users[0]).toHaveProperty("email");
		});

		it("should return initial users from mock data", async () => {
			const response = await fetch(`${baseUrl}/api/users`);
			const data = await response.json();

			expect(response.status).toBe(200);
			// Should have at least the initial 3 users
			expect(data.users.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe("GET /api/users/:id", () => {
		it("should return user by ID", async () => {
			const userId = "1";
			const response = await fetch(`${baseUrl}/api/users/${userId}`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.user).toBeDefined();
			expect(data.user.id).toBe(userId);
			expect(data.user.name).toBeDefined();
			expect(data.user.email).toBeDefined();
		});

		it("should return 404 for non-existent user", async () => {
			const response = await fetch(`${baseUrl}/api/users/999`);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("User not found");
		});
	});

	describe("POST /api/users", () => {
		it("should create a new user", async () => {
			const newUser = {
				name: "Dave",
				email: "dave@example.com",
			};

			const response = await fetch(`${baseUrl}/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.user).toBeDefined();
			expect(data.user.id).toBeDefined();
			expect(data.user.name).toBe(newUser.name);
			expect(data.user.email).toBe(newUser.email);
		});

		it("should assign sequential IDs to new users", async () => {
			const user1 = { name: "User 1", email: "user1@example.com" };
			const user2 = { name: "User 2", email: "user2@example.com" };

			const response1 = await fetch(`${baseUrl}/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(user1),
			});

			const response2 = await fetch(`${baseUrl}/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(user2),
			});

			const data1 = await response1.json();
			const data2 = await response2.json();

			expect(data1.user.id).not.toBe(data2.user.id);
		});

		it("should include new user in list after creation", async () => {
			const newUser = { name: "Test User", email: "test@example.com" };

			// Create user
			const createResponse = await fetch(`${baseUrl}/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser),
			});
			const created = await createResponse.json();

			// Verify user appears in list
			const listResponse = await fetch(`${baseUrl}/api/users`);
			const listData = await listResponse.json();

			const found = listData.users.find((u: { id: string }) => u.id === created.user.id);
			expect(found).toBeDefined();
			expect(found.name).toBe(newUser.name);
		});
	});

	describe("DELETE /api/users/:id", () => {
		it("should delete user by ID", async () => {
			// First create a user to delete
			const newUser = { name: "To Delete", email: "delete@example.com" };
			const createResponse = await fetch(`${baseUrl}/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser),
			});
			const created = await createResponse.json();
			const userId = created.user.id;

			// Delete the user
			const deleteResponse = await fetch(`${baseUrl}/api/users/${userId}`, {
				method: "DELETE",
			});

			expect(deleteResponse.status).toBe(200);
			const data = await deleteResponse.json();
			expect(data.deleted).toBeDefined();
			expect(data.deleted.id).toBe(userId);
		});

		it("should return 404 when deleting non-existent user", async () => {
			const response = await fetch(`${baseUrl}/api/users/999`, {
				method: "DELETE",
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe("User not found");
		});

		it("should remove user from list after deletion", async () => {
			// Create a user
			const newUser = { name: "Temp User", email: "temp@example.com" };
			const createResponse = await fetch(`${baseUrl}/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser),
			});
			const created = await createResponse.json();
			const userId = created.user.id;

			// Delete the user
			await fetch(`${baseUrl}/api/users/${userId}`, {
				method: "DELETE",
			});

			// Verify user is no longer in list
			const listResponse = await fetch(`${baseUrl}/api/users`);
			const listData = await listResponse.json();

			const found = listData.users.find((u: { id: string }) => u.id === userId);
			expect(found).toBeUndefined();
		});
	});

	describe("GET /api/posts", () => {
		it("should return list of all posts", async () => {
			const response = await fetch(`${baseUrl}/api/posts`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.posts).toBeDefined();
			expect(Array.isArray(data.posts)).toBe(true);
			expect(data.posts.length).toBeGreaterThan(0);
			expect(data.posts[0]).toHaveProperty("id");
			expect(data.posts[0]).toHaveProperty("title");
			expect(data.posts[0]).toHaveProperty("authorId");
		});

		it("should filter posts by authorId query parameter", async () => {
			const authorId = "1";
			const response = await fetch(`${baseUrl}/api/posts?authorId=${authorId}`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.posts).toBeDefined();
			expect(Array.isArray(data.posts)).toBe(true);
			// All returned posts should have the matching authorId
			data.posts.forEach((post: { authorId: string }) => {
				expect(post.authorId).toBe(authorId);
			});
		});

		it("should return empty array when filtering by non-existent authorId", async () => {
			const response = await fetch(`${baseUrl}/api/posts?authorId=999`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.posts).toBeDefined();
			expect(Array.isArray(data.posts)).toBe(true);
			expect(data.posts.length).toBe(0);
		});

		it("should return all posts when authorId is not provided", async () => {
			const allResponse = await fetch(`${baseUrl}/api/posts`);
			const filteredResponse = await fetch(`${baseUrl}/api/posts?authorId=1`);

			const allData = await allResponse.json();
			const filteredData = await filteredResponse.json();

			expect(allData.posts.length).toBeGreaterThanOrEqual(filteredData.posts.length);
		});
	});

	describe("GET /api/posts/:id", () => {
		it("should return post by ID", async () => {
			const postId = "1";
			const response = await fetch(`${baseUrl}/api/posts/${postId}`);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.post).toBeDefined();
			expect(data.post.id).toBe(postId);
			expect(data.post.title).toBeDefined();
			expect(data.post.authorId).toBeDefined();
		});

		it("should return 404 for non-existent post", async () => {
			const response = await fetch(`${baseUrl}/api/posts/999`);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Post not found");
		});
	});

	describe("POST /api/posts", () => {
		it("should create a new post", async () => {
			const newPost = {
				title: "New Post",
				authorId: "1",
			};

			const response = await fetch(`${baseUrl}/api/posts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newPost),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.post).toBeDefined();
			expect(data.post.id).toBeDefined();
			expect(data.post.title).toBe(newPost.title);
			expect(data.post.authorId).toBe(newPost.authorId);
		});

		it("should assign sequential IDs to new posts", async () => {
			const post1 = { title: "Post 1", authorId: "1" };
			const post2 = { title: "Post 2", authorId: "1" };

			const response1 = await fetch(`${baseUrl}/api/posts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(post1),
			});

			const response2 = await fetch(`${baseUrl}/api/posts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(post2),
			});

			const data1 = await response1.json();
			const data2 = await response2.json();

			expect(data1.post.id).not.toBe(data2.post.id);
		});

		it("should include new post in list after creation", async () => {
			const newPost = { title: "Test Post", authorId: "2" };

			// Create post
			const createResponse = await fetch(`${baseUrl}/api/posts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newPost),
			});
			const created = await createResponse.json();

			// Verify post appears in list
			const listResponse = await fetch(`${baseUrl}/api/posts`);
			const listData = await listResponse.json();

			const found = listData.posts.find((p: { id: string }) => p.id === created.post.id);
			expect(found).toBeDefined();
			expect(found.title).toBe(newPost.title);
		});
	});

	describe("Route Organization", () => {
		it("should have routes organized by prefix", async () => {
			// Users routes should be under /api/users
			const usersResponse = await fetch(`${baseUrl}/api/users`);
			expect(usersResponse.status).toBe(200);

			// Posts routes should be under /api/posts
			const postsResponse = await fetch(`${baseUrl}/api/posts`);
			expect(postsResponse.status).toBe(200);
		});

		it("should return 404 for non-existent routes", async () => {
			const response = await fetch(`${baseUrl}/api/nonexistent`);
			expect(response.status).toBe(404);
		});
	});
});
