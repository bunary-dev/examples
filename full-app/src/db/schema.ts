/**
 * Database schema: plain Drizzle tables and relations.
 *
 * The source of truth for drizzle-kit (`bun run db:generate` writes SQL
 * migrations from it into ./drizzle) and for the models.
 */

import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull().unique(),
	// An argon2id hash (the User model's `creating` event), hidden from toJSON().
	password: text().notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const notes = sqliteTable("notes", {
	id: integer().primaryKey({ autoIncrement: true }),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id),
	title: text().notNull(),
	body: text(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
	// Set by soft deletes (the Note model uses `softDeletes: true`).
	deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const usersRelations = relations(users, ({ many }) => ({
	notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
	user: one(users, { fields: [notes.userId], references: [users.id] }),
}));
