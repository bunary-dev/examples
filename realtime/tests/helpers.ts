import type { Application } from "@bunary/core";
import type { BunaryServer } from "@bunary/http";
import { serve } from "@bunary/http/provider";
import { createExampleApp, type ExampleOptions, type ExampleRouter } from "../src/app.js";
import type { ChatMessage, ChatRooms } from "../src/chat.js";
import type { EventStreams } from "../src/events.js";

export const TEST_TOKEN = "test-chat-token";

export interface TestServer {
	app: Application;
	router: ExampleRouter;
	streams: EventStreams;
	rooms: ChatRooms;
	server: BunaryServer;
	http: string;
	ws: string;
}

/** Boot a fresh app and serve it on an ephemeral port. Call `server.stop()` when done. */
export async function startTestServer(options: Partial<ExampleOptions> = {}): Promise<TestServer> {
	const { app, router, streams, rooms } = createExampleApp({
		chatToken: TEST_TOKEN,
		events: { intervalMs: 20, keepAliveMs: 15_000 },
		...options,
	});
	await app.boot();
	const server = serve(app, { port: 0 });
	return {
		app,
		router,
		streams,
		rooms,
		server,
		http: `http://localhost:${server.port}`,
		ws: `ws://localhost:${server.port}`,
	};
}

/** Resolve once `check` returns true, polling every 5 ms; reject after `timeoutMs`. */
export async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!check()) {
		if (Date.now() > deadline) throw new Error("waitFor: timed out");
		await Bun.sleep(5);
	}
}

/**
 * A WebSocket client that queues the JSON messages it receives, so a test
 * can `await client.next()` in order.
 */
export class ChatClient {
	readonly socket: WebSocket;
	readonly received: ChatMessage[] = [];
	private waiters: Array<(message: ChatMessage) => void> = [];

	constructor(url: string, options?: { headers?: Record<string, string> }) {
		this.socket = options ? new WebSocket(url, options) : new WebSocket(url);
		this.socket.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data)) as ChatMessage;
			const waiter = this.waiters.shift();
			if (waiter) waiter(message);
			else this.received.push(message);
		});
	}

	/** Resolves when the connection opens, rejects if it closes first. */
	opened(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.socket.readyState === WebSocket.OPEN) return resolve();
			this.socket.addEventListener("open", () => resolve(), { once: true });
			this.socket.addEventListener("close", () => reject(new Error("closed before open")), { once: true });
		});
	}

	/** Resolves with the close code once the connection is closed. */
	closed(): Promise<number> {
		return new Promise((resolve) => {
			if (this.socket.readyState === WebSocket.CLOSED) return resolve(1006);
			this.socket.addEventListener("close", (event) => resolve(event.code), { once: true });
		});
	}

	/** The next message, waiting up to `timeoutMs` for it. */
	next(timeoutMs = 2000): Promise<ChatMessage> {
		const queued = this.received.shift();
		if (queued) return Promise.resolve(queued);
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.waiters = this.waiters.filter((w) => w !== waiter);
				reject(new Error("next: no message"));
			}, timeoutMs);
			const waiter = (message: ChatMessage) => {
				clearTimeout(timer);
				resolve(message);
			};
			this.waiters.push(waiter);
		});
	}

	/** The next message whose `type` is `type`, skipping others. */
	async nextOf<T extends ChatMessage["type"]>(type: T): Promise<Extract<ChatMessage, { type: T }>> {
		for (;;) {
			const message = await this.next();
			if (message.type === type) return message as Extract<ChatMessage, { type: T }>;
		}
	}

	say(text: string): void {
		this.socket.send(JSON.stringify({ text }));
	}

	close(): void {
		this.socket.close();
	}
}

/** Connect to `/chat/:room` with the test token and wait for the welcome. */
export async function joinRoom(base: string, room: string, name: string): Promise<ChatClient> {
	const client = new ChatClient(`${base}/chat/${room}?token=${TEST_TOKEN}&name=${name}`);
	await client.opened();
	await client.nextOf("welcome");
	return client;
}

export interface SseFrame {
	event?: string;
	id?: string;
	data?: string;
	comment?: string;
}

/** Split an event-stream body into frames as they arrive. */
export async function* readFrames(body: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
	const decoder = new TextDecoder();
	let buffer = "";
	for await (const chunk of body) {
		buffer += decoder.decode(chunk, { stream: true });
		let end = buffer.indexOf("\n\n");
		while (end !== -1) {
			const block = buffer.slice(0, end);
			buffer = buffer.slice(end + 2);
			const frame: SseFrame = {};
			for (const line of block.split("\n")) {
				if (line.startsWith(":")) frame.comment = line.slice(1).trim();
				else {
					const colon = line.indexOf(":");
					const field = line.slice(0, colon) as "event" | "id" | "data";
					const value = line.slice(colon + 1).replace(/^ /, "");
					frame[field] = frame[field] === undefined ? value : `${frame[field]}\n${value}`;
				}
			}
			yield frame;
			end = buffer.indexOf("\n\n");
		}
	}
}
