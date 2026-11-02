/**
 * Models over the Drizzle tables, and the core provider that builds them.
 *
 * Models take the database explicitly, so `modelsProvider` builds them from
 * the database `ormProvider` bound under `DatabaseToken`, and binds them
 * under `ModelsToken` for the user provider and the route handlers.
 */

import { createToken, defineProvider } from "@bunary/core";
import { defineModel, type InstanceOf } from "@bunary/orm";
import { DatabaseToken } from "@bunary/orm/provider";
import type { AppDatabase } from "./db/database.js";
import { notes, users } from "./db/schema.js";

export function defineModels(db: AppDatabase) {
	const User = defineModel(db, users, {
		// Loaded, so the user provider can verify it, but never serialized.
		hidden: ["password"],
		events: {
			creating: async (values) => {
				values.password = await Bun.password.hash(values.password);
			},
		},
	});

	const Note = defineModel(db, notes, { softDeletes: true });

	return { User, Note };
}

export type Models = ReturnType<typeof defineModels>;
export type UserModel = InstanceOf<Models["User"]>;
export type NoteModel = InstanceOf<Models["Note"]>;

export const ModelsToken = createToken<Models>("models");

/**
 * Builds the models in `register()`. List it after `ormProvider`, whose
 * `register()` binds the database: registers run in declaration order.
 */
export const modelsProvider = defineProvider({
	name: "models",
	register(app) {
		app.set(ModelsToken, defineModels(app.get(DatabaseToken) as AppDatabase));
	},
});
