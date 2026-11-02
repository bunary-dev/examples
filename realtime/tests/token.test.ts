/**
 * CHAT_TOKEN from the environment, and the middleware that checks it.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { createRouter } from "@bunary/http";
import { DEV_CHAT_TOKEN, loadChatToken, requireChatToken } from "../src/token.js";

const saved = { CHAT_TOKEN: process.env.CHAT_TOKEN, APP_ENV: process.env.APP_ENV };

afterEach(() => {
	for (const [key, value] of Object.entries(saved)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

describe("loadChatToken", () => {
	it("reads CHAT_TOKEN", () => {
		process.env.CHAT_TOKEN = "from-env";
		expect(loadChatToken()).toBe("from-env");
	});

	it("falls back to the dev token outside production", () => {
		delete process.env.CHAT_TOKEN;
		process.env.APP_ENV = "development";
		expect(loadChatToken()).toBe(DEV_CHAT_TOKEN);
	});

	it("throws in production when CHAT_TOKEN is unset", () => {
		delete process.env.CHAT_TOKEN;
		process.env.APP_ENV = "production";
		expect(() => loadChatToken()).toThrow("CHAT_TOKEN must be set in production");
	});
});

describe("requireChatToken", () => {
	const router = createRouter();
	router.use(requireChatToken("secret"));
	router.get("/", () => ({ ok: true }));

	const status = async (path: string, headers?: Record<string, string>) =>
		(await router.fetch(new Request(`http://localhost${path}`, { headers }))).status;

	it("lets ?token= through", async () => {
		expect(await status("/?token=secret")).toBe(200);
	});

	it("lets Authorization: Bearer through", async () => {
		expect(await status("/", { Authorization: "Bearer secret" })).toBe(200);
	});

	it("rejects a missing, wrong or different-length token with 401", async () => {
		expect(await status("/")).toBe(401);
		expect(await status("/?token=secreT")).toBe(401);
		expect(await status("/?token=secret-and-more")).toBe(401);
		expect(await status("/", { Authorization: "Basic secret" })).toBe(401);
	});
});
