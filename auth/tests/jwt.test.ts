/**
 * JWT guard: POST /login issues a token, GET /me (behind requireAuth) reads it.
 */

import { afterEach, beforeAll, describe, expect, it, setSystemTime } from "bun:test";
import { createExampleApp, type ExampleRouter } from "../src/app.js";
import { createUserStore } from "../src/users.js";
import { bootTestApp, call, cookiePair, flipChar, TEST_SECRETS, testUsers } from "./helpers.js";

const ADA = { id: 1, name: "Ada Lovelace", email: "ada@example.com" };

let router: ExampleRouter;

beforeAll(async () => {
	({ router } = await bootTestApp());
});

afterEach(() => {
	setSystemTime();
});

async function login(email = "ada@example.com", password = "correct horse"): Promise<string> {
	const response = await call(router, "POST", "/login", { body: { email, password } });
	const body = await response.json();
	return body.token;
}

describe("POST /login", () => {
	it("returns the user and a token for valid credentials", async () => {
		const response = await call(router, "POST", "/login", {
			body: { email: "ada@example.com", password: "correct horse" },
		});
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.user).toEqual(ADA);
		expect(body.token).toBeString();
		expect(body.token.split(".")).toHaveLength(3);
	});

	it("never returns the password hash", async () => {
		const response = await call(router, "POST", "/login", {
			body: { email: "ada@example.com", password: "correct horse" },
		});

		expect(await response.text()).not.toContain("argon2");
	});

	it("puts only the user id in the token", async () => {
		const token = await login();
		const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());

		expect(payload.sub).toBe("1");
		expect(payload.email).toBeUndefined();
		expect(payload.exp - payload.iat).toBe(3600);
	});

	it("answers 401 for a wrong password", async () => {
		const response = await call(router, "POST", "/login", {
			body: { email: "ada@example.com", password: "wrong" },
		});

		expect(response.status).toBe(401);
		expect(response.headers.get("Content-Type")).toContain("application/problem+json");
		expect((await response.json()).token).toBeUndefined();
	});

	it("answers 401 for an unknown email", async () => {
		const response = await call(router, "POST", "/login", {
			body: { email: "nobody@example.com", password: "correct horse" },
		});

		expect(response.status).toBe(401);
	});

	it("answers 400 for a body that is not JSON", async () => {
		const response = await router.fetch(
			new Request("http://localhost/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }),
		);

		expect(response.status).toBe(400);
	});

	it("answers 401 when credentials are missing", async () => {
		const response = await call(router, "POST", "/login", { body: {} });

		expect(response.status).toBe(401);
	});
});

describe("GET /me", () => {
	it("returns the user for a valid bearer token", async () => {
		const response = await call(router, "GET", "/me", { token: await login() });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ user: ADA });
	});

	it("returns the user the token was issued for", async () => {
		const response = await call(router, "GET", "/me", { token: await login("alan@example.com", "enigma") });

		expect((await response.json()).user.email).toBe("alan@example.com");
	});

	it("answers 401 without a token", async () => {
		const response = await call(router, "GET", "/me");

		expect(response.status).toBe(401);
		expect(response.headers.get("Content-Type")).toContain("application/problem+json");
		expect(await response.json()).toEqual({ type: "about:blank", title: "Unauthorized", status: 401 });
	});

	it("answers 401 for an expired token", async () => {
		const token = await login();
		setSystemTime(new Date(Date.now() + 3601 * 1000));

		const response = await call(router, "GET", "/me", { token });

		expect(response.status).toBe(401);
	});

	it("still accepts the token just before it expires", async () => {
		const token = await login();
		setSystemTime(new Date(Date.now() + 3500 * 1000));

		const response = await call(router, "GET", "/me", { token });

		expect(response.status).toBe(200);
	});

	it("answers 401 for a token with a tampered signature", async () => {
		const [header, payload, signature] = (await login()).split(".");

		const response = await call(router, "GET", "/me", { token: `${header}.${payload}.${flipChar(signature ?? "")}` });

		expect(response.status).toBe(401);
	});

	it("answers 401 for a token whose payload was changed to another user", async () => {
		const [header, payload, signature] = (await login()).split(".");
		const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString());
		const forged = Buffer.from(JSON.stringify({ ...claims, sub: "2" })).toString("base64url");

		const response = await call(router, "GET", "/me", { token: `${header}.${forged}.${signature}` });

		expect(response.status).toBe(401);
	});

	it("answers 401 for a token signed with another secret", async () => {
		// Same users and ids, different secret: only the signature tells the tokens apart.
		const foreign = createExampleApp({
			users: await createUserStore(testUsers),
			secrets: { jwtSecret: "a-completely-different-jwt-secret", sessionSecret: TEST_SECRETS.sessionSecret },
		});
		await foreign.app.boot();
		const loginResponse = await call(foreign.router, "POST", "/login", {
			body: { email: "ada@example.com", password: "correct horse" },
		});
		const { token } = await loginResponse.json();

		const response = await call(router, "GET", "/me", { token });

		expect(response.status).toBe(401);
	});

	it("answers 401 for a garbage token", async () => {
		const response = await call(router, "GET", "/me", { token: "not-a-jwt" });

		expect(response.status).toBe(401);
	});

	it("does not accept a session cookie", async () => {
		const sessionLogin = await call(router, "POST", "/session/login", {
			body: { email: "ada@example.com", password: "correct horse" },
		});
		const cookie = cookiePair(sessionLogin.headers.get("Set-Cookie") ?? "");

		const response = await call(router, "GET", "/me", { cookie });

		expect(response.status).toBe(401);
	});
});
