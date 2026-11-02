/**
 * Users Routes Module
 *
 * Registers the `/users` group (route names `users.*`) inside whatever group
 * it is given, plus a nested `/:user/posts` group (`users.posts.*`).
 *
 * `:user` and `:post` are bound with route model binding: the resolvers in
 * `bind` turn the path params into records before the handler runs, and the
 * handler reads them from `ctx.bound`. A resolver that finds nothing answers
 * a 404 problem (`"user not found"`) without calling the handler.
 */

import type { BindingContext, GroupRouter } from "@bunary/http";
import type { Store, User } from "../data.js";

export function registerUserRoutes(api: GroupRouter, store: Store): void {
	/** Resolve `:user` to a user, or `undefined` for a 404. */
	const findUser = (id: string | undefined) => store.users.find((u) => u.id === id);

	/**
	 * Resolve `:post` to one of the bound user's posts. Bindings resolve in path
	 * order, so `ctx.bound.user` is already set; another user's post is a 404.
	 */
	const findUserPost = (id: string | undefined, ctx: BindingContext) => {
		const user = ctx.bound.user as User;
		return store.posts.find((p) => p.id === id && p.authorId === user.id);
	};

	api.group({ prefix: "/users", name: "users." }, (users) => {
		// GET /api/users - List all users
		users.get("/", (ctx) => ctx.json({ users: store.users })).name("index");

		// GET /api/users/:user - Get single user
		users.get("/:user", { bind: { user: findUser } }, (ctx) => ctx.json({ user: ctx.bound.user })).name("show");

		// POST /api/users - Create user
		users
			.post("/", async (ctx) => {
				const body = await ctx.body.json<{ name: string; email: string }>();
				const user = { id: String(store.nextId.users++), name: body.name, email: body.email };
				store.users.push(user);
				return ctx.json({ user }, { status: 201 });
			})
			.name("store");

		// DELETE /api/users/:user - Delete user
		users
			.delete("/:user", { bind: { user: findUser } }, (ctx) => {
				store.users.splice(store.users.indexOf(ctx.bound.user), 1);
				return ctx.json({ deleted: ctx.bound.user });
			})
			.name("destroy");

		// Nested group: /api/users/:user/posts
		users.group({ prefix: "/:user/posts", name: "posts." }, (userPosts) => {
			// GET /api/users/:user/posts - List one user's posts
			userPosts
				.get("/", { bind: { user: findUser } }, (ctx) => {
					const { user } = ctx.bound;
					return ctx.json({ user, posts: store.posts.filter((p) => p.authorId === user.id) });
				})
				.name("index");

			// GET /api/users/:user/posts/:post - Get one of the user's posts (scoped binding)
			userPosts
				.get("/:post", { bind: { user: findUser, post: findUserPost } }, (ctx) =>
					ctx.json({ user: ctx.bound.user, post: ctx.bound.post }),
				)
				.name("show");
		});
	});
}
