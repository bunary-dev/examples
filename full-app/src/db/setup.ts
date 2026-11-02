/**
 * `bun run db:setup` (also run by `bun run dev`): bring the database at
 * DATABASE_PATH up to date with the drizzle-kit migrations in ./drizzle.
 *
 * Only pending migrations run, so existing users and notes are kept.
 */

import { createApp } from "@bunary/core";
import { DatabaseToken, ormProvider } from "@bunary/orm/provider";
import { loadOptions } from "../config.js";
import { type AppDatabase, migrateDatabase } from "./database.js";
import * as schema from "./schema.js";

/**
 * Open the SQLite database at `path` through `ormProvider`, the same way the
 * app does, and migrate it. The caller closes it (`db.$client.close()`).
 */
export async function setupDatabase(path: string): Promise<AppDatabase> {
	const app = await createApp({
		config: { app: { name: "full-app (db:setup)" }, database: { dialect: "sqlite", path } },
		providers: [ormProvider({ schema })],
	}).boot();

	const db = app.get(DatabaseToken) as AppDatabase;
	migrateDatabase(db);
	return db;
}

if (import.meta.main) {
	const { databasePath } = loadOptions();
	const db = await setupDatabase(databasePath);
	db.$client.close();
	console.log(`✅ ${databasePath} is up to date with the migrations in drizzle/`);
}
