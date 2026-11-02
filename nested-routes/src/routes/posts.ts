/**
 * Posts Routes Module
 *
 * Registers the `/posts` group (route names `posts.*`) inside whatever group
 * it is given.
 */

import { type GroupRouter, NotFoundError } from "@bunary/http";
import type { Store } from "../data.js";

export function registerPostRoutes(api: GroupRouter, store: Store): void {
	api.group({ prefix: "/posts", name: "posts." }, (posts) => {
		// GET /api/posts - List all posts (optional ?authorId filter)
		posts
			.get("/", (ctx) => {
				const authorId = ctx.query.get("authorId");
				return ctx.json({
					posts: authorId ? store.posts.filter((p) => p.authorId === authorId) : store.posts,
				});
			})
			.name("index");

		// GET /api/posts/:id - Get single post
		posts
			.get<{ id: string }>("/:id", (ctx) => {
				const post = store.posts.find((p) => p.id === ctx.params.id);
				if (!post) {
					throw new NotFoundError("Post not found");
				}
				return ctx.json({ post });
			})
			.name("show");

		// POST /api/posts - Create post
		posts
			.post("/", async (ctx) => {
				const body = await ctx.body.json<{ title: string; authorId: string }>();
				const post = { id: String(store.nextId.posts++), title: body.title, authorId: body.authorId };
				store.posts.push(post);
				return ctx.json({ post }, { status: 201 });
			})
			.name("store");
	});
}
