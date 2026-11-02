/**
 * The WebSocket chat (`router.ws("/chat/:room")`) against a real server on an
 * ephemeral port.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { ChatClient, joinRoom, startTestServer, TEST_TOKEN, type TestServer, waitFor } from "./helpers.js";

describe("WebSocket chat", () => {
	let t: TestServer;
	const clients: ChatClient[] = [];

	const join = async (room: string, name: string) => {
		const client = await joinRoom(t.ws, room, name);
		clients.push(client);
		return client;
	};

	beforeAll(async () => {
		t = await startTestServer();
	});

	afterAll(() => {
		for (const client of clients) client.close();
		t?.server.stop();
	});

	it("puts the route params and upgrade data in ws.data (echoed in the welcome)", async () => {
		const client = new ChatClient(`${t.ws}/chat/lobby?token=${TEST_TOKEN}&name=ada`);
		clients.push(client);
		await client.opened();

		const welcome = await client.nextOf("welcome");

		expect(welcome).toEqual({ type: "welcome", room: "lobby", name: "ada", members: ["ada"] });
	});

	it("broadcasts a message to every client in the room, sender included", async () => {
		const ada = await join("general", "ada");
		const alan = await join("general", "alan");

		ada.say("hello room");

		const expected = { type: "message", room: "general", from: "ada", text: "hello room" } as const;
		expect(await ada.nextOf("message")).toEqual(expected);
		expect(await alan.nextOf("message")).toEqual(expected);
	});

	it("does not deliver a message to a client in another room", async () => {
		const ada = await join("red", "ada");
		const grace = await join("blue", "grace");

		ada.say("only red");
		await ada.nextOf("message");
		grace.say("only blue");

		// grace's own message is the first (and only) message she gets
		expect(await grace.nextOf("message")).toEqual({ type: "message", room: "blue", from: "grace", text: "only blue" });
	});

	it("announces joins to the others in the room", async () => {
		const ada = await join("joins", "ada");
		await join("joins", "alan");

		expect(await ada.nextOf("joined")).toEqual({ type: "joined", room: "joins", name: "alan" });
	});

	it("lists who is already in the room in the welcome", async () => {
		await join("roll-call", "ada");
		const alan = new ChatClient(`${t.ws}/chat/roll-call?token=${TEST_TOKEN}&name=alan`);
		clients.push(alan);

		expect((await alan.nextOf("welcome")).members).toEqual(["ada", "alan"]);
	});

	it("leaves the room on close and tells the others", async () => {
		const ada = await join("exits", "ada");
		const alan = await join("exits", "alan");
		expect((await ada.nextOf("joined")).name).toBe("alan");

		alan.close();

		expect(await ada.nextOf("left")).toEqual({ type: "left", room: "exits", name: "alan" });
		const bob = await join("exits", "bob");
		await ada.nextOf("joined");
		bob.say("still here?");
		expect(await ada.nextOf("message")).toMatchObject({ from: "bob" });
	});

	it("drops an empty room once everyone has left", async () => {
		const ada = await join("empty", "ada");
		expect(t.rooms.members("empty")).toEqual(["ada"]);

		ada.close();

		await waitFor(() => !t.rooms.has("empty"));
	});

	it("answers a malformed message with an error, to the sender only", async () => {
		const ada = await join("errors", "ada");
		const alan = await join("errors", "alan");

		ada.socket.send("not json");
		expect(await ada.nextOf("error")).toEqual({ type: "error", detail: 'Send JSON like {"text": "hi"}' });

		ada.say("ok");
		expect(await alan.nextOf("message")).toMatchObject({ text: "ok" });
	});

	it("defaults the name to anonymous", async () => {
		const client = new ChatClient(`${t.ws}/chat/anon?token=${TEST_TOKEN}`);
		clients.push(client);

		expect((await client.nextOf("welcome")).name).toBe("anonymous");
	});

	it("accepts the token as an Authorization: Bearer header", async () => {
		const client = new ChatClient(`${t.ws}/chat/headers?name=ada`, { headers: { Authorization: `Bearer ${TEST_TOKEN}` } });
		clients.push(client);

		await client.opened();
		expect((await client.nextOf("welcome")).room).toBe("headers");
	});

	describe("before the upgrade", () => {
		const upgradeHeaders = {
			Connection: "Upgrade",
			Upgrade: "websocket",
			"Sec-WebSocket-Version": "13",
			"Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
		};

		it("rejects an upgrade without a token with 401", async () => {
			const response = await fetch(`${t.http}/chat/lobby`, { headers: upgradeHeaders });

			expect(response.status).toBe(401);
			expect(response.headers.get("content-type")).toContain("application/problem+json");
			expect(((await response.json()) as { detail: string }).detail).toBe("A valid chat token is required");
		});

		it("rejects an upgrade with a wrong token with 401", async () => {
			const response = await fetch(`${t.http}/chat/lobby?token=nope`, { headers: upgradeHeaders });

			expect(response.status).toBe(401);
		});

		it("never opens a WebSocket for an unauthorised client", async () => {
			const before = t.rooms.members("guarded").length;
			const client = new ChatClient(`${t.ws}/chat/guarded?token=wrong`);

			expect(client.opened()).rejects.toThrow("closed before open");
			await client.closed();
			expect(t.rooms.members("guarded").length).toBe(before);
		});

		it("answers a plain GET /chat/x (no Upgrade header) with 426", async () => {
			const response = await fetch(`${t.http}/chat/x?token=${TEST_TOKEN}`);

			expect(response.status).toBe(426);
		});
	});
});
