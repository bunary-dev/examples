/**
 * Users Routes Module
 *
 * Demonstrates organizing routes by resource.
 * All routes in this module are prefixed with /api/users
 */

import type { BunaryApp } from "@bunary/http";

// Mock user data
const users = [
	{ id: "1", name: "Alice", email: "alice@example.com" },
	{ id: "2", name: "Bob", email: "bob@example.com" },
	{ id: "3", name: "Charlie", email: "charlie@example.com" },
];

/**
 * Register user routes on the app with the given prefix.
 */
export function registerUserRoutes(app: BunaryApp, prefix: string): void {
	// GET /api/users - List all users
	app.get(`${prefix}`, () => {
		return { users };
	});

	// GET /api/users/:id - Get single user
	app.get(`${prefix}/:id`, (ctx) => {
		const user = users.find((u) => u.id === ctx.params.id);

		if (!user) {
			return new Response(JSON.stringify({ error: "User not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return { user };
	});

	// POST /api/users - Create user
	app.post(`${prefix}`, async (ctx) => {
		const body = (await ctx.request.json()) as { name: string; email: string };
		const newUser = {
			id: String(users.length + 1),
			name: body.name,
			email: body.email,
		};
		users.push(newUser);

		return new Response(JSON.stringify({ user: newUser }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	});

	// DELETE /api/users/:id - Delete user
	app.delete(`${prefix}/:id`, (ctx) => {
		const index = users.findIndex((u) => u.id === ctx.params.id);

		if (index === -1) {
			return new Response(JSON.stringify({ error: "User not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const deleted = users.splice(index, 1)[0];
		return { deleted };
	});
}
