/**
 * `bun run db:setup`: (re)create example.sqlite from the migrations in
 * ./drizzle and seed it with the sample data.
 */

import { rmSync } from "node:fs";
import { defineModels } from "../models.js";
import { seed } from "../seed.js";
import { bootDatabase } from "./database.js";

export const databasePath = "./example.sqlite";

/** Delete `path`, migrate a fresh database there and seed it. */
export async function setupDatabase(path: string) {
	if (path !== ":memory:") {
		for (const suffix of ["", "-wal", "-shm", "-journal"]) rmSync(`${path}${suffix}`, { force: true });
	}
	const db = await bootDatabase(path);
	const models = defineModels(db);
	await seed(models);
	return { db, models };
}

if (import.meta.main) {
	const { db } = await setupDatabase(databasePath);
	db.$client.close();
	console.log(`✅ Created ${databasePath} (migrations applied, sample data seeded)`);
}
