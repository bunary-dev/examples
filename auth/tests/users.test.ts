/**
 * The in-memory user store and the UserProvider over it.
 */

import { beforeAll, describe, expect, it } from "bun:test";
import { createUserProvider, createUserStore, demoUsers, type UserStore } from "../src/users.js";
import { testUsers } from "./helpers.js";

describe("createUserStore", () => {
	let store: UserStore;

	beforeAll(async () => {
		store = await createUserStore(testUsers);
	});

	it("keeps only password hashes, never the plaintext", async () => {
		const hash = store.passwordHash(1);

		expect(hash).toBeString();
		expect(hash).not.toBe("correct horse");
		expect(hash?.startsWith("$argon2")).toBe(true);
		expect(await Bun.password.verify("correct horse", hash ?? "")).toBe(true);
	});

	it("never hands out the hash with a user", () => {
		expect(store.findById(1)).toEqual({ id: 1, name: "Ada Lovelace", email: "ada@example.com" });
		expect(store.findByEmail("alan@example.com")).toEqual({ id: 2, name: "Alan Turing", email: "alan@example.com" });
	});

	it("returns null for unknown users", () => {
		expect(store.findById(99)).toBeNull();
		expect(store.findByEmail("nobody@example.com")).toBeNull();
		expect(store.passwordHash(99)).toBeNull();
	});

	it("seeds the demo users by default", async () => {
		const demo = await createUserStore();

		expect(demo.findByEmail(demoUsers[0]?.email ?? "")).not.toBeNull();
	});
});

describe("createUserProvider", () => {
	let store: UserStore;

	beforeAll(async () => {
		store = await createUserStore(testUsers);
	});

	it("retrieves users by id, numeric or string", async () => {
		const provider = createUserProvider(store);

		expect(await provider.retrieveById(1)).toEqual({ id: 1, name: "Ada Lovelace", email: "ada@example.com" });
		expect(await provider.retrieveById("2")).toEqual({ id: 2, name: "Alan Turing", email: "alan@example.com" });
		expect(await provider.retrieveById(99)).toBeNull();
	});

	it("retrieves users by email, ignoring the password", async () => {
		const provider = createUserProvider(store);

		expect((await provider.retrieveByCredentials({ email: "ada@example.com", password: "wrong" }))?.id).toBe(1);
		expect(await provider.retrieveByCredentials({ email: "nobody@example.com" })).toBeNull();
		expect(await provider.retrieveByCredentials({ email: 1 })).toBeNull();
	});

	it("validates passwords with Bun.password.verify", async () => {
		const provider = createUserProvider(store);
		const ada = store.findById(1);
		if (!ada) throw new Error("seed user missing");

		expect(await provider.validateCredentials(ada, { email: ada.email, password: "correct horse" })).toBe(true);
		expect(await provider.validateCredentials(ada, { email: ada.email, password: "enigma" })).toBe(false);
		expect(await provider.validateCredentials(ada, { email: ada.email })).toBe(false);
		expect(await provider.validateCredentials(ada, { email: ada.email, password: 123 })).toBe(false);
	});
});
