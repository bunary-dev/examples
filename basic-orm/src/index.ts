/**
 * Basic ORM Example
 *
 * Demonstrates @bunary/orm 0.4 on Drizzle:
 * - Drizzle SQLite tables (src/db/schema.ts) and drizzle-kit migrations
 * - Booting the database through @bunary/core with `ormProvider`
 * - `defineModel(db, table)` models (src/models.ts)
 * - Reading: find, findOrFail, where().get()/first(), query()
 * - CRUD with dirty tracking: create, save, refresh, delete
 * - Hidden columns and model events
 * - Named scopes, soft deletes and eager-loaded relations with `with()`
 */

import { ModelNotFoundError } from "@bunary/orm";
import { desc, eq, gt } from "drizzle-orm";
import { users } from "./db/schema.js";
import { databasePath, setupDatabase } from "./db/setup.js";
import type { Models } from "./models.js";

async function demonstrate({ User, Post }: Models) {
	console.log("\n📊 Demonstrating ORM operations\n");

	// ------------------------------------------------------------------------
	// Reading
	// ------------------------------------------------------------------------

	console.log("1️⃣  find() a user by primary key");
	const john = await User.find(1);
	console.log("   Result (toJSON, password hidden):", john?.toJSON());
	console.log();

	console.log("2️⃣  findOrFail() throws ModelNotFoundError");
	try {
		await User.findOrFail(999);
	} catch (error) {
		if (!(error instanceof ModelNotFoundError)) throw error;
		console.log(`   ${error.table} #${String(error.id)} not found`);
	}
	console.log();

	console.log("3️⃣  where() with Drizzle conditions");
	const over25 = await User.where(gt(users.age, 25)).get();
	console.log("   Users over 25:", over25.map((u) => u.name));
	const jane = await User.where(eq(users.email, "jane@example.com")).first();
	console.log("   First match by email:", jane?.name);
	console.log();

	console.log("4️⃣  query() for ordering and limits (plain Drizzle rows)");
	const oldest = await User.query().orderBy(desc(users.age)).limit(2);
	console.log("   Two oldest:", oldest.map((u) => u.name));
	console.log();

	// ------------------------------------------------------------------------
	// CRUD with dirty tracking
	// ------------------------------------------------------------------------

	console.log("5️⃣  create() (the creating event hashes the password)");
	const dana = await User.create({ name: "Dana Lee", email: "dana@example.com", password: "pw", age: 41 });
	if (!dana) throw new Error("create was cancelled by a listener");
	console.log("   Created:", dana.toJSON());
	console.log("   Password is hashed:", dana.password.startsWith("$argon2"));
	console.log();

	console.log("6️⃣  Dirty tracking and save()");
	dana.age = 42;
	console.log("   isDirty('age'):", dana.isDirty("age"), "getDirty():", dana.getDirty());
	await dana.save(); // UPDATE users SET age = ? WHERE id = ?
	console.log("   After save, isDirty():", dana.isDirty());
	console.log();

	console.log("7️⃣  refresh() discards unsaved changes");
	dana.name = "Not saved";
	await dana.refresh();
	console.log("   Name after refresh:", dana.name);
	console.log();

	console.log("8️⃣  delete()");
	await dana.delete();
	console.log("   Found after delete:", await User.find(dana.id));
	console.log();

	// ------------------------------------------------------------------------
	// Scopes
	// ------------------------------------------------------------------------

	console.log("9️⃣  Named scopes");
	const active = await User.active().get();
	console.log(`   Active users: ${active.length}`);
	const activeOver25 = await User.active().olderThan(25).get();
	console.log("   Active users over 25:", activeOver25.map((u) => u.name));
	const published = await Post.published().get();
	console.log(`   Published posts: ${published.length}`);
	console.log();

	// ------------------------------------------------------------------------
	// Soft deletes
	// ------------------------------------------------------------------------

	console.log("🔟 Soft deletes");
	const draft = await Post.findOrFail(4);
	await draft.delete(); // sets deleted_at
	console.log("   trashed():", draft.trashed(), "find() after delete:", await Post.find(4));
	console.log("   withTrashed():", (await Post.withTrashed().get()).length, "posts");
	console.log("   onlyTrashed():", (await Post.onlyTrashed().get()).map((p) => p.title));
	await draft.restore();
	console.log("   Restored, trashed():", draft.trashed());
	console.log();

	// ------------------------------------------------------------------------
	// Relations
	// ------------------------------------------------------------------------

	console.log("1️⃣1️⃣  Eager-loading relations with with()");
	const author = await User.with({ posts: Post }).findOrFail(1);
	console.log(`   ${author.name} wrote:`, author.posts.map((p) => p.title));
	const post = await Post.with({ author: User }).findOrFail(3);
	console.log(`   "${post.title}" was written by ${post.author.name}`);
	console.log();
}

/** Set up the database at `path`, seed it and run every demo step. */
export async function runExample(path: string = databasePath) {
	console.log(`
🚀 Bunary Basic ORM Example

@bunary/orm models on Drizzle: defineModel(db, table)
`);

	const { db, models } = await setupDatabase(path);
	console.log(`✅ Database ${path} migrated and seeded`);
	try {
		await demonstrate(models);
	} finally {
		db.$client.close();
	}
	console.log("✅ All examples completed successfully!");
}

if (import.meta.main) {
	try {
		await runExample();
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}
