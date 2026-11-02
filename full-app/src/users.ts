/**
 * The auth `UserProvider`, implemented over the orm `User` model.
 *
 * It is a plain object that fits auth's `UserProvider` interface; auth and
 * orm know nothing about each other. The models only exist once the app
 * registers its providers, while the provider is part of the config the app
 * is created with, so it takes a function that resolves them at request time.
 *
 * The users it hands out (to the guard, `attempt()` and so the `/login`
 * response) are `toJSON()` snapshots, which leave out the hidden `password`;
 * `validateCredentials` loads the hash through the model by id.
 */

import type { UserProvider } from "@bunary/auth";
import { eq } from "drizzle-orm";
import { users } from "./db/schema.js";
import type { Models, UserModel } from "./models.js";

/** A user without the password: what `toJSON()` returns. */
export type PublicUser = ReturnType<UserModel["toJSON"]>;

export function createUserProvider(models: () => Models): UserProvider<PublicUser> {
	return {
		retrieveById: async (id) => (await models().User.find(Number(id)))?.toJSON() ?? null,
		// Look the user up by email only, never by the password column.
		async retrieveByCredentials(credentials) {
			if (typeof credentials.email !== "string") return null;
			const user = await models().User.where(eq(users.email, credentials.email)).first();
			return user?.toJSON() ?? null;
		},
		async validateCredentials(user, credentials) {
			const stored = await models().User.find(user.id);
			if (typeof credentials.password !== "string" || !stored) return false;
			// Constant-time comparison against the argon2id hash
			return await Bun.password.verify(credentials.password, stored.password);
		},
	};
}
