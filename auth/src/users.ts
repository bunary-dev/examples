/**
 * In-memory users and the UserProvider the guards look them up through.
 *
 * Passwords are hashed with `Bun.password.hash` (argon2id) when the store is
 * created; the plaintext is never kept. The hash stays inside the store: every
 * user the store (and so the provider, the guards and `ctx.locals.user`) hands
 * out is a {@link PublicUser}, and `validateCredentials` asks the store for the
 * hash by id.
 */

import type { AuthUser, UserProvider } from "@bunary/auth";

/** A user as handlers and responses see it: no password hash. */
export interface PublicUser extends AuthUser {
	id: number;
	name: string;
	email: string;
}

/** A user to seed the store with, password in plaintext (hashed on creation). */
export interface SeedUser {
	id: number;
	name: string;
	email: string;
	password: string;
}

export interface UserStore {
	findById(id: number): PublicUser | null;
	findByEmail(email: string): PublicUser | null;
	/** The stored argon2id hash, or null for an unknown id. */
	passwordHash(id: number): string | null;
}

/** Demo users for `bun run dev`. Development data only. */
export const demoUsers: SeedUser[] = [
	{ id: 1, name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery staple" },
	{ id: 2, name: "Alan Turing", email: "alan@example.com", password: "enigma-1912" },
];

interface StoredUser extends PublicUser {
	passwordHash: string;
}

function toPublic({ id, name, email }: StoredUser): PublicUser {
	return { id, name, email };
}

/** Create a store, hashing each seed user's password. Each call has its own users. */
export async function createUserStore(seed: SeedUser[] = demoUsers): Promise<UserStore> {
	const users: StoredUser[] = await Promise.all(
		seed.map(async ({ password, ...user }) => ({ ...user, passwordHash: await Bun.password.hash(password) })),
	);

	return {
		findById(id) {
			const user = users.find((u) => u.id === id);
			return user ? toPublic(user) : null;
		},
		findByEmail(email) {
			const user = users.find((u) => u.email === email);
			return user ? toPublic(user) : null;
		},
		passwordHash(id) {
			return users.find((u) => u.id === id)?.passwordHash ?? null;
		},
	};
}

/** The UserProvider both guards use. */
export function createUserProvider(store: UserStore): UserProvider<PublicUser> {
	return {
		// The session guard stores the id; take it as a number either way.
		retrieveById: (id) => store.findById(Number(id)),
		retrieveByCredentials: (credentials) =>
			typeof credentials.email === "string" ? store.findByEmail(credentials.email) : null,
		async validateCredentials(user, credentials) {
			const hash = store.passwordHash(user.id);
			if (typeof credentials.password !== "string" || hash === null) return false;
			// Constant-time comparison against the argon2id hash
			return await Bun.password.verify(credentials.password, hash);
		},
	};
}
