/**
 * The notes API end to end, against the booted app and a migrated temp
 * SQLite database (fresh per test, deleted afterwards).
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { notes } from "../src/db/schema.js";
import { ModelsToken } from "../src/models.js";
import { ada, alan, bootTestApp, call, type CallOptions, type JsonResponse, registerAndLogin, type TestApp } from "./helpers.js";

let t: TestApp;
/** Every response body the test saw, to check none of them leaks a password. */
let bodies: string[];

beforeEach(async () => {
	t = await bootTestApp();
	bodies = [];
});

afterEach(() => {
	t.cleanup();
});

/** `call()`, recording the response body. */
async function send(method: string, path: string, options?: CallOptions): Promise<JsonResponse> {
	const response = await call(t.router, method, path, options);
	const text = await response.clone().text();
	bodies.push(text);
	return response;
}

describe("POST /register", () => {
	it("creates a user and returns it without the password", async () => {
		const response = await send("POST", "/register", { body: ada });
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body.user).toMatchObject({ id: 1, name: ada.name, email: ada.email });
		expect(body.user).not.toHaveProperty("password");
	});

	it("stores an argon2id hash, never the plaintext", async () => {
		await send("POST", "/register", { body: ada });
		const user = await t.app.get(ModelsToken).User.findOrFail(1);

		expect(user.password).toStartWith("$argon2id$");
		expect(await Bun.password.verify(ada.password, user.password)).toBe(true);
	});

	it("refuses a second account with the same email (409)", async () => {
		await send("POST", "/register", { body: ada });
		const response = await send("POST", "/register", { body: { ...ada, name: "Someone else" } });

		expect(response.status).toBe(409);
	});

	it("validates the body (422, every issue listed)", async () => {
		const response = await send("POST", "/register", { body: { name: "", email: "nope", password: "short" } });
		const body = await response.json();

		expect(response.status).toBe(422);
		const paths = body.errors.map((issue: { path: string }) => issue.path);
		expect(paths).toEqual(["name", "email", "password"]);
	});
});

describe("POST /login", () => {
	beforeEach(async () => {
		await send("POST", "/register", { body: ada });
	});

	it("returns the user and a JWT for the right password", async () => {
		const response = await send("POST", "/login", { body: { email: ada.email, password: ada.password } });
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.user).toMatchObject({ id: 1, email: ada.email });
		expect(body.token.split(".")).toHaveLength(3);
	});

	it("answers a wrong password or unknown email with 401", async () => {
		const wrong = await send("POST", "/login", { body: { email: ada.email, password: "wrong" } });
		const unknown = await send("POST", "/login", { body: { email: "who@example.com", password: ada.password } });

		expect(wrong.status).toBe(401);
		expect(unknown.status).toBe(401);
	});

	it("can't be logged into by matching on the password hash", async () => {
		const user = await t.app.get(ModelsToken).User.findOrFail(1);
		const response = await send("POST", "/login", { body: { email: ada.email, password: user.password } });

		expect(response.status).toBe(401);
	});
});

describe("GET /me", () => {
	it("loads the token's user through the model", async () => {
		const token = await registerAndLogin(t.router, ada);
		const response = await send("GET", "/me", { token });

		expect(response.status).toBe(200);
		expect((await response.json()).user).toMatchObject({ id: 1, name: ada.name, email: ada.email });
	});
});

describe("unauthenticated requests", () => {
	const routes: [string, string][] = [
		["GET", "/me"],
		["GET", "/notes"],
		["POST", "/notes"],
		["GET", "/notes/1"],
		["PATCH", "/notes/1"],
		["DELETE", "/notes/1"],
	];

	for (const [method, path] of routes) {
		it(`${method} ${path} gets 401`, async () => {
			const response = await send(method, path, method === "POST" || method === "PATCH" ? { body: { title: "x" } } : {});

			expect(response.status).toBe(401);
			expect(response.headers.get("Content-Type")).toContain("application/problem+json");
		});
	}

	it("a forged token gets 401", async () => {
		const token = await registerAndLogin(t.router, ada);
		const [header, payload] = token.split(".");
		const response = await send("GET", "/notes", { token: `${header}.${payload}.forged` });

		expect(response.status).toBe(401);
	});
});

describe("notes", () => {
	let token: string;

	beforeEach(async () => {
		token = await registerAndLogin(t.router, ada);
	});

	it("creates, lists, reads, updates and deletes a note", async () => {
		const created = await send("POST", "/notes", { token, body: { title: "Groceries", body: "eggs" } });
		const { note } = await created.json();
		expect(created.status).toBe(201);
		expect(note).toMatchObject({ id: 1, userId: 1, title: "Groceries", body: "eggs", deletedAt: null });

		const list = await send("GET", "/notes", { token });
		expect((await list.json()).notes.map((n: { title: string }) => n.title)).toEqual(["Groceries"]);

		const read = await send("GET", `/notes/${note.id}`, { token });
		expect((await read.json()).note.title).toBe("Groceries");

		const updated = await send("PATCH", `/notes/${note.id}`, { token, body: { body: "eggs, milk" } });
		expect(updated.status).toBe(200);
		expect((await updated.json()).note).toMatchObject({ title: "Groceries", body: "eggs, milk" });

		const deleted = await send("DELETE", `/notes/${note.id}`, { token });
		expect(deleted.status).toBe(204);

		expect((await send("GET", `/notes/${note.id}`, { token })).status).toBe(404);
		expect((await (await send("GET", "/notes", { token })).json()).notes).toEqual([]);
	});

	it("soft-deletes: withTrashed() still finds a deleted note", async () => {
		const { note } = await (await send("POST", "/notes", { token, body: { title: "Temporary" } })).json();
		await send("DELETE", `/notes/${note.id}`, { token });
		const { Note } = t.app.get(ModelsToken);

		expect(await Note.find(note.id)).toBeNull();
		const trashed = await Note.withTrashed().where(eq(notes.id, note.id)).first();
		expect(trashed?.title).toBe("Temporary");
		expect(trashed?.trashed()).toBe(true);
		expect(trashed?.deletedAt).toBeInstanceOf(Date);
	});

	it("a deleted note can't be updated or deleted again", async () => {
		const { note } = await (await send("POST", "/notes", { token, body: { title: "Gone" } })).json();
		await send("DELETE", `/notes/${note.id}`, { token });

		expect((await send("PATCH", `/notes/${note.id}`, { token, body: { title: "Back?" } })).status).toBe(404);
		expect((await send("DELETE", `/notes/${note.id}`, { token })).status).toBe(404);
	});

	it("answers an unknown note with 404", async () => {
		expect((await send("GET", "/notes/999", { token })).status).toBe(404);
	});

	describe("validation (422)", () => {
		it("requires a non-empty title on create", async () => {
			const response = await send("POST", "/notes", { token, body: { title: "  ", body: 42 } });
			const body = await response.json();

			expect(response.status).toBe(422);
			expect(body.errors.map((issue: { path: string }) => issue.path)).toEqual(["title", "body"]);
		});

		it("rejects a non-object body", async () => {
			expect((await send("POST", "/notes", { token, body: ["title"] })).status).toBe(422);
		});

		it("requires at least one field on update", async () => {
			await send("POST", "/notes", { token, body: { title: "Keep" } });
			const response = await send("PATCH", "/notes/1", { token, body: {} });

			expect(response.status).toBe(422);
		});

		it("rejects a non-numeric id", async () => {
			const response = await send("GET", "/notes/abc", { token });
			const body = await response.json();

			expect(response.status).toBe(422);
			expect(body.errors[0].path).toBe("id");
		});

		it("never writes on a rejected update", async () => {
			await send("POST", "/notes", { token, body: { title: "Keep" } });
			await send("PATCH", "/notes/1", { token, body: { title: "" } });

			expect((await (await send("GET", "/notes/1", { token })).json()).note.title).toBe("Keep");
		});
	});

	describe("another user", () => {
		let other: string;
		let noteId: number;

		beforeEach(async () => {
			noteId = (await (await send("POST", "/notes", { token, body: { title: "Ada's secret" } })).json()).note.id;
			other = await registerAndLogin(t.router, alan);
		});

		it("doesn't see them in the list", async () => {
			await send("POST", "/notes", { token: other, body: { title: "Alan's note" } });
			const response = await send("GET", "/notes", { token: other });

			expect((await response.json()).notes.map((n: { title: string }) => n.title)).toEqual(["Alan's note"]);
		});

		it("can't read, update or delete them (404)", async () => {
			expect((await send("GET", `/notes/${noteId}`, { token: other })).status).toBe(404);
			expect((await send("PATCH", `/notes/${noteId}`, { token: other, body: { title: "Mine now" } })).status).toBe(404);
			expect((await send("DELETE", `/notes/${noteId}`, { token: other })).status).toBe(404);

			const read = await send("GET", `/notes/${noteId}`, { token });
			expect((await read.json()).note.title).toBe("Ada's secret");
		});
	});
});

describe("passwords", () => {
	it("never appear in any response", async () => {
		await send("POST", "/register", { body: ada });
		await send("POST", "/register", { body: ada }); // 409
		await send("POST", "/register", { body: { ...alan, email: "bad" } }); // 422
		await send("POST", "/login", { body: { email: ada.email, password: "wrong" } });
		const { token } = await (await send("POST", "/login", { body: { email: ada.email, password: ada.password } })).json();
		await send("GET", "/me", { token });
		await send("POST", "/notes", { token, body: { title: "A note" } });
		await send("GET", "/notes", { token });
		await send("PATCH", "/notes/1", { token, body: { title: "Edited" } });
		await send("DELETE", "/notes/1", { token });

		const hash = (await t.app.get(ModelsToken).User.findOrFail(1)).password;
		expect(bodies.length).toBe(10);
		for (const body of bodies) {
			expect(body).not.toContain(ada.password);
			expect(body).not.toContain(alan.password);
			expect(body).not.toContain(hash);
			expect(body).not.toContain("$argon2");
			expect(body).not.toContain('"password"');
		}
	});
});
