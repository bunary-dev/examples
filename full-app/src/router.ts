/**
 * The notes API.
 *
 *   GET    /             health, lists the endpoints
 *   POST   /register     { name, email, password } → 201 { user }
 *   POST   /login        { email, password }       → { user, token } (JWT)
 *   GET    /me           requireAuth → { user }
 *   GET    /notes        requireAuth → { notes } (the user's own)
 *   POST   /notes        requireAuth, { title, body? } → 201 { note }
 *   GET    /notes/:id    requireAuth → { note }
 *   PATCH  /notes/:id    requireAuth, { title?, body? } → { note }
 *   DELETE /notes/:id    requireAuth → 204 (soft delete)
 *
 * Handlers reach the models through the app container (`ctx.app`, set by
 * `httpProvider`), and see `ctx.locals.user` (`{ id }` from the token) inside
 * `requireAuth()` groups. Another user's note is answered with 404, the same
 * as one that does not exist.
 */

import { type AuthUserLocals, authMiddleware, requireAuth } from "@bunary/auth/provider";
import { type AnyContext, cors, createRouter, problem, type Router } from "@bunary/http";
import { and, eq } from "drizzle-orm";
import { notes, users } from "./db/schema.js";
import { type Models, ModelsToken } from "./models.js";
import { createNoteBody, noteParams, registerBody, updateNoteBody } from "./validation.js";

/** The user the JWT guard maps a token to (see config.ts). */
export interface TokenUser {
	id: number;
	[key: string]: unknown;
}

export type Locals = AuthUserLocals<TokenUser>;
export type FullAppRouter = Router<Locals>;

const ENDPOINTS = [
	"POST /register",
	"POST /login",
	"GET /me",
	"GET /notes",
	"POST /notes",
	"GET /notes/:id",
	"PATCH /notes/:id",
	"DELETE /notes/:id",
];

function models(ctx: AnyContext<Locals>): Models {
	if (!ctx.app) throw new Error("The router must be mounted with httpProvider()");
	return ctx.app.get(ModelsToken);
}

/** The signed-in user's id; only called inside requireAuth() groups. */
function userId(ctx: AnyContext<Locals>): number {
	const user = ctx.locals.user;
	if (!user) throw new Error("userId() outside requireAuth()");
	return user.id;
}

/** The user's own note `id`, or null (missing, soft-deleted or someone else's). */
async function findOwnNote(ctx: AnyContext<Locals>, id: number) {
	return await models(ctx)
		.Note.where(and(eq(notes.id, id), eq(notes.userId, userId(ctx))))
		.first();
}

const noteNotFound = () => problem(404, "Note not found");

export function buildRouter(): FullAppRouter {
	const router = createRouter<Locals>();

	router.use(cors<Locals>());
	router.use(authMiddleware<Locals>());

	router.get("/", () => ({ status: "ok", message: "Full App Example", endpoints: ENDPOINTS }));

	router.post("/register", { body: registerBody }, async (ctx) => {
		const { User } = models(ctx);
		if (await User.where(eq(users.email, ctx.body.email)).first()) {
			return problem(409, "Email already registered");
		}
		// The `creating` event hashes the password; toJSON() leaves it out.
		const user = await User.create(ctx.body);
		return ctx.json({ user }, { status: 201 });
	});

	router.post("/login", async (ctx) => {
		const credentials = await ctx.body.json<Record<string, unknown>>();
		const result = await ctx.locals.auth.attempt(credentials, "jwt");
		if (!result) return problem(401, "Invalid email or password");
		return { user: result.user, token: result.token };
	});

	router.group({ prefix: "/me", middleware: [requireAuth<Locals>()] }, (me) => {
		me.get("/", async (ctx) => {
			const user = await models(ctx).User.find(userId(ctx));
			return user ? { user } : problem(404, "User not found");
		});
	});

	router.group({ prefix: "/notes", middleware: [requireAuth<Locals>()] }, (group) => {
		group.get("/", async (ctx) => ({
			notes: await models(ctx).Note.where(eq(notes.userId, userId(ctx))).get(),
		}));

		group.post("/", { body: createNoteBody }, async (ctx) => {
			const note = await models(ctx).Note.create({ ...ctx.body, userId: userId(ctx) });
			return ctx.json({ note }, { status: 201 });
		});

		group.get("/:id", { params: noteParams }, async (ctx) => {
			const note = await findOwnNote(ctx, ctx.params.id);
			return note ? { note } : noteNotFound();
		});

		group.patch("/:id", { params: noteParams, body: updateNoteBody }, async (ctx) => {
			const note = await findOwnNote(ctx, ctx.params.id);
			if (!note) return noteNotFound();
			if (ctx.body.title !== undefined) note.title = ctx.body.title;
			if (ctx.body.body !== undefined) note.body = ctx.body.body;
			await note.save();
			return { note };
		});

		group.delete("/:id", { params: noteParams }, async (ctx) => {
			const note = await findOwnNote(ctx, ctx.params.id);
			if (!note) return noteNotFound();
			await note.delete(); // sets deleted_at; the note is kept
			return new Response(null, { status: 204 });
		});
	});

	return router;
}
