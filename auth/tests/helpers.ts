import type { Application } from "@bunary/core";
import { createExampleApp, type ExampleRouter } from "../src/app.js";
import { createUserStore, type SeedUser } from "../src/users.js";

/** A Response whose JSON body the tests read loosely. */
// biome-ignore lint/suspicious/noExplicitAny: test assertions inspect arbitrary JSON
export type JsonResponse = Omit<Response, "json"> & { json(): Promise<any> };

/** Test users: fast to hash, and known passwords. */
export const testUsers: SeedUser[] = [
	{ id: 1, name: "Ada Lovelace", email: "ada@example.com", password: "correct horse" },
	{ id: 2, name: "Alan Turing", email: "alan@example.com", password: "enigma" },
];

export const TEST_SECRETS = {
	jwtSecret: "test-jwt-secret-not-used-anywhere-else",
	sessionSecret: "test-session-key-exactly-32-byte",
};

/** Boot a fresh app (own user store, own secrets) and return its router. */
export async function bootTestApp(): Promise<{ app: Application; router: ExampleRouter }> {
	const users = await createUserStore(testUsers);
	const { app, router } = createExampleApp({ users, secrets: TEST_SECRETS });
	await app.boot();
	return { app, router };
}

export interface CallOptions {
	body?: unknown;
	token?: string;
	cookie?: string;
}

/**
 * Send a request straight to a router, without starting a server.
 */
export function call(router: ExampleRouter, method: string, path: string, options: CallOptions = {}): Promise<JsonResponse> {
	const headers = new Headers();
	if (options.body !== undefined) headers.set("Content-Type", "application/json");
	if (options.token !== undefined) headers.set("Authorization", `Bearer ${options.token}`);
	if (options.cookie !== undefined) headers.set("Cookie", options.cookie);
	return router.fetch(
		new Request(`http://localhost${path}`, {
			method,
			headers,
			...(options.body !== undefined && { body: JSON.stringify(options.body) }),
		}),
	);
}

/** The `name=value` part of a Set-Cookie header, ready for a Cookie header. */
export function cookiePair(setCookie: string): string {
	return setCookie.split(";")[0] ?? "";
}

/** Change one character in the middle of `part`, keeping it valid base64url. */
export function flipChar(part: string): string {
	const i = Math.floor(part.length / 2);
	const replacement = part[i] === "A" ? "B" : "A";
	return part.slice(0, i) + replacement + part.slice(i + 1);
}
