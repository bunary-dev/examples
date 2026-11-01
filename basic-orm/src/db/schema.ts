/**
 * Database schema: plain Drizzle tables and relations.
 *
 * This file is the source of truth for drizzle-kit (`bun run db:generate`
 * writes SQL migrations from it into ./drizzle) and for the models.
 */

import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull().unique(),
	// Hashed in the User model's `creating` event, hidden from toJSON().
	password: text().notNull(),
	age: integer(),
	active: integer({ mode: "boolean" }).notNull().default(true),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const posts = sqliteTable("posts", {
	id: integer().primaryKey({ autoIncrement: true }),
	authorId: integer("author_id")
		.notNull()
		.references(() => users.id),
	title: text().notNull(),
	body: text(),
	published: integer({ mode: "boolean" }).notNull().default(false),
	// Set by soft deletes (the Post model uses `softDeletes: true`).
	deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const usersRelations = relations(users, ({ many }) => ({
	posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
	author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
