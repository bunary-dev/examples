/**
 * Server-Sent Events (`sse()` on GET /events) against a real server.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { readFrames, type SseFrame, startTestServer, type TestServer, waitFor } from "./helpers.js";

describe("GET /events", () => {
	let t: TestServer | undefined;

	afterEach(() => {
		t?.server.stop();
		t = undefined;
	});

	it("is a text/event-stream", async () => {
		t = await startTestServer();
		const controller = new AbortController();
		const response = await fetch(`${t.http}/events`, { signal: controller.signal });

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toStartWith("text/event-stream");
		expect(response.headers.get("cache-control")).toBe("no-cache");
		controller.abort();
	});

	it("streams named tick events with an id and JSON data", async () => {
		t = await startTestServer();
		const controller = new AbortController();
		const response = await fetch(`${t.http}/events`, { signal: controller.signal });

		const frames: SseFrame[] = [];
		for await (const frame of readFrames(response.body!)) {
			if (frame.event) frames.push(frame);
			if (frames.length === 2) break;
		}
		controller.abort();

		expect(frames.map((f) => [f.event, f.id])).toEqual([
			["tick", "1"],
			["tick", "2"],
		]);
		const data = frames.map((f) => JSON.parse(f.data!));
		expect(data.map((d) => d.count)).toEqual([1, 2]);
		for (const d of data) expect(new Date(d.time).toISOString()).toBe(d.time);
	});

	it("sends a keep-alive comment while idle", async () => {
		t = await startTestServer({ events: { intervalMs: 60_000, keepAliveMs: 10 } });
		const controller = new AbortController();
		const response = await fetch(`${t.http}/events`, { signal: controller.signal });

		let comment: string | undefined;
		for await (const frame of readFrames(response.body!)) {
			comment = frame.comment;
			if (comment) break;
		}
		controller.abort();

		expect(comment).toBe("ping");
	});

	it("resumes the count after Last-Event-ID", async () => {
		t = await startTestServer();
		const controller = new AbortController();
		const response = await fetch(`${t.http}/events`, { signal: controller.signal, headers: { "Last-Event-ID": "41" } });

		let first: SseFrame | undefined;
		for await (const frame of readFrames(response.body!)) {
			if (frame.event) {
				first = frame;
				break;
			}
		}
		controller.abort();

		expect(first?.id).toBe("42");
	});

	it("ends the stream and stops the timer when the client disconnects", async () => {
		t = await startTestServer();
		const controller = new AbortController();
		const response = await fetch(`${t.http}/events`, { signal: controller.signal });
		const reader = response.body!.getReader();
		await reader.read();
		await waitFor(() => t!.streams.active === 1);

		controller.abort();

		// the client side of the stream ends…
		await expect(
			(async () => {
				for (;;) if ((await reader.read()).done) return;
			})(),
		).rejects.toThrow();
		// …and the server stopped producing events for it
		await waitFor(() => t!.streams.active === 0);
		expect(t.streams.active).toBe(0);
	});

	it("counts concurrent streams independently", async () => {
		t = await startTestServer();
		const a = new AbortController();
		const b = new AbortController();
		await fetch(`${t.http}/events`, { signal: a.signal });
		await fetch(`${t.http}/events`, { signal: b.signal });
		await waitFor(() => t!.streams.active === 2);

		a.abort();
		await waitFor(() => t!.streams.active === 1);
		b.abort();
		await waitFor(() => t!.streams.active === 0);
	});
});
