/**
 * Basic ORM Example Tests
 *
 * Every operation the example demonstrates, run against a fresh in-memory
 * SQLite database per test (migrated with the example's own drizzle-kit
 * migrations and seeded with its sample data).
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ModelNotFoundError } from "@bunary/orm";
import { desc, eq, gt } from "drizzle-orm";
import { type AppDatabase, bootDatabase } from "../src/db/database.js";
import { posts, users } from "../src/db/schema.js";
import { defineModels, type Models } from "../src/models.js";
import { seed } from "../src/seed.js";

let db: AppDatabase;
let models: Models;

beforeEach(async () => {
	db = await bootDatabase(":memory:");
	models = defineModels(db);
	await seed(models);
});

afterEach(() => {
	db.$client.close();
});

describe("setup", () => {
	it("applies the drizzle-kit migrations", () => {
		const tables = db.$client
			.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
			.all()
			.map((row) => row.name);
		expect(tables).toContain("users");
		expect(tables).toContain("posts");
		expect(tables).toContain("__drizzle_migrations");
	});

	it("seeds the sample data", async () => {
		expect(await db.$count(users)).toBe(5);
		expect(await db.$count(posts)).toBe(5);
	});
});

describe("reading", () => {
	it("find() returns an instance or null", async () => {
		const user = await models.User.find(1);
		expect(user?.name).toBe("John Doe");
		expect(await models.User.find(999)).toBeNull();
	});

	it("findOrFail() throws ModelNotFoundError", async () => {
		const error = await models.User.findOrFail(999).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ModelNotFoundError);
		expect((error as ModelNotFoundError).table).toBe("users");
	});

	it("where().get() and .first() take Drizzle conditions", async () => {
		const over25 = await models.User.where(gt(users.age, 25)).get();
		expect(over25.map((u) => u.name).sort()).toEqual([
			"Alice Brown",
			"Bob Wilson",
			"Jane Smith",
		]);
		const jane = await models.User.where(eq(users.email, "jane@example.com")).first();
		expect(jane?.id).toBe(2);
	});

	it("query() covers ordering and limits", async () => {
		const oldest = await models.User.query().orderBy(desc(users.age)).limit(2);
		expect(oldest.map((u) => u.name)).toEqual(["Alice Brown", "Jane Smith"]);
	});
});

describe("hidden columns", () => {
	it("leaves password out of toJSON() but keeps it on the instance", async () => {
		const user = await models.User.findOrFail(1);
		expect(user.password).toBeString();
		expect(user.toJSON()).not.toHaveProperty("password");
		expect(JSON.parse(JSON.stringify(user))).not.toHaveProperty("password");
	});

	it("hashes the password in the creating event", async () => {
		const user = await models.User.findOrFail(1);
		expect(user.password).not.toBe("secret123");
		expect(await Bun.password.verify("secret123", user.password)).toBe(true);
	});
});

describe("CRUD with dirty tracking", () => {
	it("create() inserts and returns a clean instance with database defaults", async () => {
		const user = await models.User.create({
			name: "Dana Lee",
			email: "dana@example.com",
			password: "pw",
			age: 41,
		});
		if (!user) throw new Error("create was cancelled");
		expect(user.id).toBe(6);
		expect(user.active).toBe(true);
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.isDirty()).toBe(false);
	});

	it("save() writes only the dirty columns", async () => {
		const user = await models.User.findOrFail(1);
		user.name = "John Q. Doe";
		expect(user.isDirty("name")).toBe(true);
		expect(user.getDirty()).toEqual({ name: "John Q. Doe" });

		// Another instance of the same row changes a different column.
		const other = await models.User.findOrFail(1);
		other.age = 26;
		await other.save();

		await user.save();
		expect(user.isDirty()).toBe(false);
		const reloaded = await models.User.findOrFail(1);
		expect(reloaded.name).toBe("John Q. Doe");
		expect(reloaded.age).toBe(26);
	});

	it("refresh() discards unsaved changes", async () => {
		const user = await models.User.findOrFail(1);
		user.name = "Unsaved";
		await user.refresh();
		expect(user.name).toBe("John Doe");
		expect(user.isDirty()).toBe(false);
	});

	it("delete() removes the row", async () => {
		const user = await models.User.findOrFail(5);
		expect(await user.delete()).toBe(true);
		expect(await models.User.find(5)).toBeNull();
	});
});

describe("scopes", () => {
	it("active() and olderThan() chain", async () => {
		const active = await models.User.active().get();
		expect(active).toHaveLength(4);
		const activeOver25 = await models.User.active().olderThan(25).get();
		expect(activeOver25.map((u) => u.name).sort()).toEqual(["Alice Brown", "Jane Smith"]);
	});

	it("published() filters posts", async () => {
		expect(await models.Post.published().get()).toHaveLength(4);
	});
});

describe("soft deletes", () => {
	it("delete() trashes, withTrashed()/onlyTrashed() find it, restore() brings it back", async () => {
		const post = await models.Post.findOrFail(4);
		await post.delete();
		expect(post.trashed()).toBe(true);
		expect(await models.Post.find(4)).toBeNull();
		expect(await db.$count(posts)).toBe(5); // still in the table

		expect(await models.Post.withTrashed().get()).toHaveLength(5);
		const trashed = await models.Post.onlyTrashed().get();
		expect(trashed.map((p) => p.id)).toEqual([4]);

		await post.restore();
		expect(post.trashed()).toBe(false);
		expect(await models.Post.find(4)).not.toBeNull();
	});

	it("forceDelete() really deletes", async () => {
		const post = await models.Post.findOrFail(4);
		await post.forceDelete();
		expect(await models.Post.withTrashed().find(4)).toBeNull();
		expect(await db.$count(posts)).toBe(4);
	});
});

describe("relations with()", () => {
	it("eager-loads a user's posts as Post instances", async () => {
		const john = await models.User.with({ posts: models.Post }).findOrFail(1);
		expect(john.posts.map((p) => p.title).sort()).toEqual(["First Post", "Second Post"]);
		expect(typeof john.posts[0]?.save).toBe("function");
		expect(john.toJSON().posts).toHaveLength(2);
		expect(john.toJSON()).not.toHaveProperty("password");
	});

	it("eager-loads a post's author and leaves out trashed posts", async () => {
		const post = await models.Post.with({ author: models.User }).findOrFail(3);
		expect(post.author.name).toBe("Jane Smith");

		await (await models.Post.findOrFail(4)).delete();
		const jane = await models.User.with({ posts: models.Post }).findOrFail(2);
		expect(jane.posts.map((p) => p.id)).toEqual([3]);
	});
});
