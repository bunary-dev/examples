/**
 * Session guard: POST /session/login sets the encrypted cookie, GET
 * /session/me reads it, POST /session/logout clears it.
 */

import { afterEach, beforeAll, describe, expect, it, setSystemTime } from "bun:test";
import type { ExampleRouter } from "../src/app.js";
import { bootTestApp, call, cookiePair, flipChar } from "./helpers.js";

const ADA = { id: 1, name: "Ada Lovelace", email: "ada@example.com" };

let router: ExampleRouter;

beforeAll(async () => {
	({ router } = await bootTestApp());
});

afterEach(() => {
	setSystemTime();
});

async function login(): Promise<string> {
	const response = await call(router, "POST", "/session/login", {
		body: { email: "ada@example.com", password: "correct horse" },
	});
	return response.headers.get("Set-Cookie") ?? "";
}

describe("POST /session/login", () => {
	it("returns the user and sets the session cookie", async () => {
		const response = await call(router, "POST", "/session/login", {
			body: { email: "ada@example.com", password: "correct horse" },
		});
		const setCookie = response.headers.get("Set-Cookie") ?? "";

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ user: ADA });
		expect(setCookie).toStartWith("bunary_session=");
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie.toLowerCase()).toContain("samesite=lax");
		expect(setCookie).toContain("Max-Age=7200");
	});

	it("encrypts the session: the cookie does not reveal the user", async () => {
		const value = decodeURIComponent(cookiePair(await login()).split("=")[1] ?? "");

		// A JWE compact token has five parts; the user id is in the ciphertext.
		expect(value.split(".")).toHaveLength(5);
		expect(value).not.toContain("ada");
	});

	it("answers 401 and sets no cookie for a wrong password", async () => {
		const response = await call(router, "POST", "/session/login", {
			body: { email: "ada@example.com", password: "wrong" },
		});

		expect(response.status).toBe(401);
		expect(response.headers.get("Set-Cookie")).toBeNull();
	});

	it("answers 401 for an unknown email", async () => {
		const response = await call(router, "POST", "/session/login", {
			body: { email: "nobody@example.com", password: "correct horse" },
		});

		expect(response.status).toBe(401);
		expect(response.headers.get("Set-Cookie")).toBeNull();
	});
});

describe("GET /session/me", () => {
	it("returns the user for the session cookie", async () => {
		const response = await call(router, "GET", "/session/me", { cookie: cookiePair(await login()) });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ user: ADA });
	});

	it("answers 401 without a cookie", async () => {
		const response = await call(router, "GET", "/session/me");

		expect(response.status).toBe(401);
		expect(response.headers.get("Content-Type")).toContain("application/problem+json");
	});

	it("answers 401 for a modified cookie", async () => {
		const [name, value] = cookiePair(await login()).split("=");
		const parts = decodeURIComponent(value ?? "").split(".");
		// Change the ciphertext: the AES-GCM tag no longer matches.
		parts[3] = flipChar(parts[3] ?? "");

		const response = await call(router, "GET", "/session/me", { cookie: `${name}=${parts.join(".")}` });

		expect(response.status).toBe(401);
	});

	it("answers 401 for a garbage cookie", async () => {
		const response = await call(router, "GET", "/session/me", { cookie: "bunary_session=forged" });

		expect(response.status).toBe(401);
	});

	it("answers 401 once the session has expired", async () => {
		const cookie = cookiePair(await login());
		setSystemTime(new Date(Date.now() + 7201 * 1000));

		const response = await call(router, "GET", "/session/me", { cookie });

		expect(response.status).toBe(401);
	});

	it("does not accept a bearer token", async () => {
		const loginResponse = await call(router, "POST", "/login", {
			body: { email: "ada@example.com", password: "correct horse" },
		});
		const { token } = await loginResponse.json();

		const response = await call(router, "GET", "/session/me", { token });

		expect(response.status).toBe(401);
	});
});

describe("POST /session/logout", () => {
	it("clears the session cookie", async () => {
		const response = await call(router, "POST", "/session/logout", { cookie: cookiePair(await login()) });
		const setCookie = response.headers.get("Set-Cookie") ?? "";

		expect(response.status).toBe(204);
		expect(setCookie).toStartWith("bunary_session=");
		expect(setCookie).toContain("Max-Age=0");
	});

	it("leaves the browser with no session: login → me → logout → me", async () => {
		const cookie = cookiePair(await login());
		expect((await call(router, "GET", "/session/me", { cookie })).status).toBe(200);

		const logout = await call(router, "POST", "/session/logout", { cookie });
		// The browser stores what logout sent back: an empty, expired cookie.
		const cleared = cookiePair(logout.headers.get("Set-Cookie") ?? "");

		expect((await call(router, "GET", "/session/me", { cookie: cleared })).status).toBe(401);
	});
});
