/**
 * Basic ORM Example Tests
 * 
 * Comprehensive tests for ORM functionality in the basic-orm example.
 * Tests model queries, protected fields, timestamps, and method chaining.
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { defineConfig, clearBunaryConfig } from "@bunary/core";
import { Users, Posts } from "../src/models/index.js";

describe("Basic ORM Example", () => {
	let testDbPath: string;

	beforeAll(() => {
		// Create a temporary test database
		testDbPath = `/tmp/bunary-basic-orm-test-${Date.now()}.sqlite`;

		// Configure Bunary with test database
		defineConfig({
			app: {
				name: "Basic ORM Example Test",
				env: "test",
				debug: false,
			},
			orm: {
				database: {
					type: "sqlite",
					sqlite: {
						path: testDbPath,
					},
				},
			},
		});

		// Initialize test database with schema and data
		const db = new Database(testDbPath);

		// Create users table
		db.exec(`
			CREATE TABLE users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				email TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL,
				secret_key TEXT,
				age INTEGER,
				active INTEGER DEFAULT 1,
				createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
				updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create posts table
		db.exec(`
			CREATE TABLE posts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				title TEXT NOT NULL,
				content TEXT,
				published INTEGER DEFAULT 0,
				createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
				updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id)
			);
		`);

		// Insert sample users
		db.exec(`
			INSERT INTO users (name, email, password, secret_key, age, active) VALUES
				('John Doe', 'john@example.com', 'secret123', 'key123', 25, 1),
				('Jane Smith', 'jane@example.com', 'secret456', 'key456', 30, 1),
				('Bob Wilson', 'bob@example.com', 'secret789', 'key789', 28, 0),
				('Alice Brown', 'alice@example.com', 'secret012', 'key012', 35, 1),
				('Charlie Davis', 'charlie@example.com', 'secret345', 'key345', 22, 1);
		`);

		// Insert sample posts
		db.exec(`
			INSERT INTO posts (user_id, title, content, published) VALUES
				(1, 'First Post', 'This is my first post!', 1),
				(1, 'Second Post', 'Another post by John', 1),
				(2, 'Hello World', 'Jane says hello', 1),
				(2, 'Draft Post', 'This is a draft', 0),
				(4, 'Alice Post', 'Content from Alice', 1);
		`);

		db.close();
	});

	afterAll(async () => {
		// Clean up test database
		try {
			const db = new Database(testDbPath);
			db.close();
			await Bun.file(testDbPath).unlink();
		} catch {
			// Ignore cleanup errors
		}
		clearBunaryConfig();
	});

	describe("Basic Queries", () => {
		it("should find a user by ID", async () => {
			const user = await Users.find(1);

			expect(user).not.toBeNull();
			expect(user?.id).toBe(1);
			expect(user?.name).toBe("John Doe");
			expect(user?.email).toBe("john@example.com");
		});

		it("should return null for non-existent user", async () => {
			const user = await Users.find(999);
			expect(user).toBeNull();
		});

		it("should get all users", async () => {
			const users = await Users.all();

			expect(users).toBeDefined();
			expect(Array.isArray(users)).toBe(true);
			expect(users.length).toBe(5);
		});

		it("should select specific columns", async () => {
			const users = await Users.select("id", "name", "email").all();

			expect(users.length).toBeGreaterThan(0);
			const firstUser = users[0];
			expect(firstUser).toHaveProperty("id");
			expect(firstUser).toHaveProperty("name");
			expect(firstUser).toHaveProperty("email");
			// Should not have other columns
			expect(firstUser).not.toHaveProperty("age");
		});
	});

	describe("Protected Fields Exclusion", () => {
		it("should automatically exclude password and secret_key from results", async () => {
			const user = await Users.find(1);

			expect(user).not.toBeNull();
			expect(user).not.toHaveProperty("password");
			expect(user).not.toHaveProperty("secret_key");
		});

		it("should exclude protected fields from all() results", async () => {
			const users = await Users.all();

			expect(users.length).toBeGreaterThan(0);
			users.forEach((user) => {
				expect(user).not.toHaveProperty("password");
				expect(user).not.toHaveProperty("secret_key");
			});
		});

		it("should exclude protected fields even when using select()", async () => {
			const users = await Users.select("id", "name", "email", "password").all();

			expect(users.length).toBeGreaterThan(0);
			users.forEach((user) => {
				// password should be excluded even if selected
				expect(user).not.toHaveProperty("password");
				expect(user).not.toHaveProperty("secret_key");
			});
		});
	});

	describe("Timestamps Exclusion", () => {
		it("should automatically exclude createdAt and updatedAt from Users (timestamps=true)", async () => {
			const user = await Users.find(1);

			expect(user).not.toBeNull();
			expect(user).not.toHaveProperty("createdAt");
			expect(user).not.toHaveProperty("updatedAt");
		});

		it("should include createdAt and updatedAt in Posts (timestamps=false)", async () => {
			const post = await Posts.find(1);

			expect(post).not.toBeNull();
			expect(post).toHaveProperty("createdAt");
			expect(post).toHaveProperty("updatedAt");
		});

		it("should exclude timestamps from all Users results", async () => {
			const users = await Users.all();

			expect(users.length).toBeGreaterThan(0);
			users.forEach((user) => {
				expect(user).not.toHaveProperty("createdAt");
				expect(user).not.toHaveProperty("updatedAt");
			});
		});

		it("should include timestamps in all Posts results", async () => {
			const posts = await Posts.all();

			expect(posts.length).toBeGreaterThan(0);
			posts.forEach((post) => {
				expect(post).toHaveProperty("createdAt");
				expect(post).toHaveProperty("updatedAt");
			});
		});
	});

	describe("Where Clauses", () => {
		it("should filter by equality", async () => {
			const activeUsers = await Users.where("active", 1).all();

			expect(activeUsers.length).toBeGreaterThan(0);
			activeUsers.forEach((user) => {
				expect(user.active).toBe(1);
			});
		});

		it("should filter with comparison operators", async () => {
			const youngUsers = await Users.where("age", "<", 30).all();

			expect(youngUsers.length).toBeGreaterThan(0);
			youngUsers.forEach((user) => {
				expect(user.age).toBeLessThan(30);
			});
		});

		it("should chain multiple where clauses", async () => {
			const users = await Users.where("active", 1).where("age", ">", 25).all();

			expect(users.length).toBeGreaterThan(0);
			users.forEach((user) => {
				expect(user.active).toBe(1);
				expect(user.age).toBeGreaterThan(25);
			});
		});
	});

	describe("Limit and Offset", () => {
		it("should limit results", async () => {
			const users = await Users.limit(2).all();

			expect(users.length).toBe(2);
		});

		it("should offset results", async () => {
			const allUsers = await Users.orderBy("id", "asc").all();
			const offsetUsers = await Users.orderBy("id", "asc").offset(2).all();

			expect(offsetUsers.length).toBeLessThan(allUsers.length);
			if (offsetUsers.length > 0 && allUsers.length > 2) {
				expect(offsetUsers[0].id).toBe(allUsers[2].id);
			}
		});

		it("should combine offset and limit for pagination", async () => {
			const page2 = await Users.orderBy("id", "asc").offset(2).limit(2).all();

			expect(page2.length).toBeLessThanOrEqual(2);
		});
	});

	describe("Order By", () => {
		it("should order results ascending", async () => {
			const users = await Users.orderBy("name", "asc").all();

			expect(users.length).toBeGreaterThan(1);
			for (let i = 1; i < users.length; i++) {
				expect(users[i].name >= users[i - 1].name).toBe(true);
			}
		});

		it("should order results descending", async () => {
			const users = await Users.orderBy("age", "desc").all();

			expect(users.length).toBeGreaterThan(1);
			for (let i = 1; i < users.length; i++) {
				expect(users[i].age <= users[i - 1].age).toBe(true);
			}
		});
	});

	describe("First and Count", () => {
		it("should get first record", async () => {
			const firstUser = await Users.orderBy("id", "asc").first();

			expect(firstUser).not.toBeNull();
			expect(firstUser?.id).toBe(1);
		});

		it("should return null when no records match", async () => {
			const user = await Users.where("id", 999).first();
			expect(user).toBeNull();
		});

		it("should count all records", async () => {
			const total = await Users.count();
			expect(total).toBe(5);
		});

		it("should count filtered records", async () => {
			const activeCount = await Users.where("active", 1).count();
			expect(activeCount).toBeGreaterThan(0);
			expect(activeCount).toBeLessThanOrEqual(5);
		});
	});

	describe("Method Chaining", () => {
		it("should chain select, where, orderBy, and limit", async () => {
			const results = await Users.select("id", "name", "email", "age", "active")
				.where("active", 1)
				.where("age", ">", 25)
				.orderBy("age", "desc")
				.limit(3)
				.all();

			expect(results.length).toBeLessThanOrEqual(3);
			if (results.length > 0) {
				// Verify all results are active
				results.forEach((user) => {
					expect(user.active).toBe(1);
					expect(user.age).toBeGreaterThan(25);
				});

				// Verify ordering (descending by age)
				for (let i = 1; i < results.length; i++) {
					expect(results[i].age <= results[i - 1].age).toBe(true);
				}
			}
		});

		it("should chain where, orderBy, offset, and limit", async () => {
			const results = await Users.where("active", 1)
				.orderBy("id", "asc")
				.offset(1)
				.limit(2)
				.all();

			expect(results.length).toBeLessThanOrEqual(2);
		});
	});

	describe("Posts Model", () => {
		it("should query posts", async () => {
			const posts = await Posts.all();

			expect(posts).toBeDefined();
			expect(Array.isArray(posts)).toBe(true);
			expect(posts.length).toBeGreaterThan(0);
		});

		it("should filter posts by user_id", async () => {
			const userPosts = await Posts.where("user_id", 1).all();

			expect(userPosts.length).toBeGreaterThan(0);
			userPosts.forEach((post) => {
				expect(post.user_id).toBe(1);
			});
		});

		it("should filter posts by published status", async () => {
			const publishedPosts = await Posts.where("published", 1).all();

			expect(publishedPosts.length).toBeGreaterThan(0);
			publishedPosts.forEach((post) => {
				expect(post.published).toBe(1);
			});
		});

		it("should include timestamps in Posts results", async () => {
			const post = await Posts.find(1);

			expect(post).not.toBeNull();
			expect(post).toHaveProperty("createdAt");
			expect(post).toHaveProperty("updatedAt");
		});
	});

	describe("Complex Query Patterns", () => {
		it("should handle complex query with multiple conditions", async () => {
			const results = await Users.select("id", "name", "email", "age")
				.where("active", 1)
				.where("age", ">", 25)
				.orderBy("age", "desc")
				.limit(3)
				.all();

			expect(results.length).toBeLessThanOrEqual(3);
			results.forEach((user) => {
				expect(user).toHaveProperty("id");
				expect(user).toHaveProperty("name");
				expect(user).toHaveProperty("email");
				expect(user).toHaveProperty("age");
				expect(user).not.toHaveProperty("password");
				expect(user).not.toHaveProperty("secret_key");
				expect(user).not.toHaveProperty("createdAt");
				expect(user).not.toHaveProperty("updatedAt");
			});
		});

		it("should handle query with exclude", async () => {
			const users = await Users.exclude("age").all();

			expect(users.length).toBeGreaterThan(0);
			users.forEach((user) => {
				expect(user).not.toHaveProperty("age");
				expect(user).not.toHaveProperty("password");
				expect(user).not.toHaveProperty("secret_key");
			});
		});
	});
});
