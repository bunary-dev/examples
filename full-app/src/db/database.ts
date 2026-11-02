/**
 * The database type `ormProvider` builds for the `sqlite` dialect, and the
 * drizzle-kit migrations it is brought up to date with.
 */

import type { Database } from "bun:sqlite";
import { join } from "node:path";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type * as schema from "./schema.js";

/** `app.get(DatabaseToken)` is typed `AnyDatabase`; this is what it holds here. */
export type AppDatabase = BunSQLiteDatabase<typeof schema> & { $client: Database };

/** Folder drizzle-kit writes migrations to (see drizzle.config.ts). */
export const migrationsFolder = join(import.meta.dir, "../../drizzle");

/** Apply the migrations in ./drizzle that `db` has not run yet. */
export function migrateDatabase(db: AppDatabase): void {
	db.$client.exec("PRAGMA foreign_keys = ON");
	migrate(db, { migrationsFolder });
}
