/**
 * Server-Sent Events: GET /events streams a counter as named `tick` events.
 */

import { type RequestContext, sse } from "@bunary/http";

export interface EventOptions {
	/** Milliseconds between ticks (default 1000) */
	intervalMs?: number;
	/** Milliseconds between `: ping` keep-alive comments (default 15000) */
	keepAliveMs?: number;
}

/** How many event streams are open right now. */
export interface EventStreams {
	readonly active: number;
}

/**
 * The GET /events handler and the count of open streams.
 *
 * Each tick is `event: tick`, `id: <n>` and `data: {"count": n, "time": "…"}`.
 * A client reconnecting with `Last-Event-ID: n` continues from n + 1. The
 * interval is cleared when the client disconnects (`stream.signal` aborts).
 */
export function createEventsHandler({ intervalMs = 1000, keepAliveMs = 15_000 }: EventOptions = {}) {
	let active = 0;
	const streams: EventStreams = {
		get active() {
			return active;
		},
	};

	const handler = (ctx: RequestContext<object>) => {
		const lastId = Number.parseInt(ctx.request.headers.get("last-event-id") ?? "", 10);
		let count = Number.isSafeInteger(lastId) && lastId >= 0 ? lastId : 0;

		return sse(
			ctx,
			(stream) => {
				active++;
				const tick = () => {
					count++;
					stream.send({ event: "tick", id: String(count), data: { count, time: new Date().toISOString() } });
				};
				tick();
				const timer = setInterval(tick, intervalMs);
				stream.signal.addEventListener("abort", () => {
					clearInterval(timer);
					active--;
				});
			},
			{ keepAlive: keepAliveMs },
		);
	};

	return { handler, streams };
}
