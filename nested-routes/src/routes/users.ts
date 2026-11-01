/**
 * Users Routes Module
 *
 * Registers the `/users` group (route names `users.*`) inside whatever group
 * it is given, plus a nested `/:userId/posts` group (`users.posts.*`).
 */

import type { GroupRouter } from "@bunary/http";
import type { Store } from "../data.js";

export function registerUserRoutes(api: GroupRouter, store: Store): void {
	api.group({ prefix: "/users", name: "users." }, (users) => {
		// GET /api/users - List all users
		users.get("/", (ctx) => ctx.json({ users: store.users })).name("index");

		// GET /api/users/:id - Get single user
		users
			.get<{ id: string }>("/:id", (ctx) => {
				const user = store.users.find((u) => u.id === ctx.params.id);
				if (!user) {
					return ctx.json({ error: "User not found" }, { status: 404 });
				}
				return ctx.json({ user });
			})
			.name("show");

		// POST /api/users - Create user
		users
			.post("/", async (ctx) => {
				const body = await ctx.body.json<{ name: string; email: string }>();
				const user = { id: String(store.nextId.users++), name: body.name, email: body.email };
				store.users.push(user);
				return ctx.json({ user }, { status: 201 });
			})
			.name("store");

		// DELETE /api/users/:id - Delete user
		users
			.delete<{ id: string }>("/:id", (ctx) => {
				const index = store.users.findIndex((u) => u.id === ctx.params.id);
				if (index === -1) {
					return ctx.json({ error: "User not found" }, { status: 404 });
				}
				const [deleted] = store.users.splice(index, 1);
				return ctx.json({ deleted });
			})
			.name("destroy");

		// Nested group: /api/users/:userId/posts
		users.group({ prefix: "/:userId/posts", name: "posts." }, (userPosts) => {
			// GET /api/users/:userId/posts - List one user's posts
			userPosts
				.get<{ userId: string }>("/", (ctx) => {
					const user = store.users.find((u) => u.id === ctx.params.userId);
					if (!user) {
						return ctx.json({ error: "User not found" }, { status: 404 });
					}
					return ctx.json({ user, posts: store.posts.filter((p) => p.authorId === user.id) });
				})
				.name("index");
		});
	});
}
