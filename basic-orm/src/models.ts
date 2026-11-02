/**
 * Models: `defineModel()` wraps each Drizzle table.
 *
 * Models take the database explicitly, so they are built per database by
 * `defineModels(db)`: the example uses a file, the tests an in-memory db.
 */

import { defineModel } from "@bunary/orm";
import { eq, gt } from "drizzle-orm";
import type { AppDatabase } from "./db/database.js";
import { posts, users } from "./db/schema.js";

export function defineModels(db: AppDatabase) {
	const User = defineModel(db, users, {
		// Loaded and usable in code, but never serialized.
		hidden: ["password"],
		events: {
			// Hash before insert; listeners may edit the insert values.
			creating: async (values) => {
				values.password = await Bun.password.hash(values.password);
			},
		},
		scopes: {
			active: (q) => q.where(eq(users.active, true)),
			olderThan: (q, age: number) => q.where(gt(users.age, age)),
		},
	});

	const Post = defineModel(db, posts, {
		softDeletes: true,
		scopes: {
			published: (q) => q.where(eq(posts.published, true)),
		},
	});

	return { User, Post };
}

export type Models = ReturnType<typeof defineModels>;
