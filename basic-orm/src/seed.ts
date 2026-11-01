/**
 * Sample data, inserted through the models so the `creating` event hashes
 * each password.
 */

import type { Models } from "./models.js";

const sampleUsers = [
	{ name: "John Doe", email: "john@example.com", password: "secret123", age: 25, active: true },
	{ name: "Jane Smith", email: "jane@example.com", password: "secret456", age: 30, active: true },
	{ name: "Bob Wilson", email: "bob@example.com", password: "secret789", age: 28, active: false },
	{ name: "Alice Brown", email: "alice@example.com", password: "secret012", age: 35, active: true },
	{ name: "Charlie Davis", email: "charlie@example.com", password: "secret345", age: 22, active: true },
];

const samplePosts = [
	{ authorId: 1, title: "First Post", body: "This is my first post!", published: true },
	{ authorId: 1, title: "Second Post", body: "Another post by John", published: true },
	{ authorId: 2, title: "Hello World", body: "Jane says hello", published: true },
	{ authorId: 2, title: "Draft Post", body: "This is a draft", published: false },
	{ authorId: 4, title: "Alice Post", body: "Content from Alice", published: true },
];

export async function seed({ User, Post }: Models): Promise<void> {
	for (const user of sampleUsers) await User.create(user);
	for (const post of samplePosts) await Post.create(post);
}
