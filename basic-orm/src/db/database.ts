/**
 * Database bootstrap.
 *
 * Boots a @bunary/core app with the orm's `ormProvider`, which builds the
 * Drizzle database from the `database` config key, then applies the
 * drizzle-kit migrations in ./drizzle.
 */

import type { Database } from "bun:sqlite";
import { join } from "node:path";
import { createApp } from "@bunary/core";
import { DatabaseToken, ormProvider } from "@bunary/orm/provider";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema.js";

/** The Drizzle database `ormProvider` builds for the `sqlite` dialect. */
export type AppDatabase = BunSQLiteDatabase<typeof schema> & { $client: Database };

/** Folder drizzle-kit writes migrations to (see drizzle.config.ts). */
export const migrationsFolder = join(import.meta.dir, "../../drizzle");

/**
 * Open the SQLite database at `path` (or `":memory:"`) and bring its schema
 * up to date.
 */
export async function bootDatabase(path: string): Promise<AppDatabase> {
	const app = await createApp({
		config: {
			app: { name: "Basic ORM Example" },
			database: { dialect: "sqlite", path },
		},
		providers: [ormProvider({ schema })],
	}).boot();

	const db = app.get(DatabaseToken) as AppDatabase;
	db.$client.exec("PRAGMA foreign_keys = ON");
	migrate(db, { migrationsFolder });
	return db;
}
