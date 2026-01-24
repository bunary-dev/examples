/**
 * Posts Routes Module
 *
 * Demonstrates organizing routes by resource.
 * All routes in this module are prefixed with /api/posts
 */

import type { BunaryApp } from "@bunary/http";

// Mock post data
const posts = [
	{ id: "1", title: "Hello World", authorId: "1" },
	{ id: "2", title: "Getting Started with Bunary", authorId: "1" },
	{ id: "3", title: "TypeScript Tips", authorId: "2" },
];

/**
 * Register post routes on the app with the given prefix.
 */
export function registerPostRoutes(app: BunaryApp, prefix: string): void {
	// GET /api/posts - List all posts
	app.get(`${prefix}`, (ctx) => {
		// Optional filter by author
		const authorId = ctx.query.get("authorId");

		if (authorId) {
			return { posts: posts.filter((p) => p.authorId === authorId) };
		}

		return { posts };
	});

	// GET /api/posts/:id - Get single post
	app.get(`${prefix}/:id`, (ctx) => {
		const post = posts.find((p) => p.id === ctx.params.id);

		if (!post) {
			return new Response(JSON.stringify({ error: "Post not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return { post };
	});

	// POST /api/posts - Create post
	app.post(`${prefix}`, async (ctx) => {
		const body = (await ctx.request.json()) as { title: string; authorId: string };
		const newPost = {
			id: String(posts.length + 1),
			title: body.title,
			authorId: body.authorId,
		};
		posts.push(newPost);

		return new Response(JSON.stringify({ post: newPost }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	});
}
