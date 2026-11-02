/**
 * The @bunary/core Application with the router mounted by `httpProvider`.
 * `serve(app)` starts it with `router.listen()`, which also hands the
 * router's `websocket` handler to `Bun.serve`.
 */

import { type Application, createApp } from "@bunary/core";
import { httpProvider } from "@bunary/http/provider";
import { type ChatRooms, createChatRooms } from "./chat.js";
import { buildConfig } from "./config.js";
import { createEventsHandler, type EventOptions, type EventStreams } from "./events.js";
import { buildRouter, type ExampleRouter } from "./router.js";

export type { ExampleRouter } from "./router.js";

export interface ExampleOptions {
	/** Token a client needs to open a chat socket */
	chatToken: string;
	/** Tick and keep-alive intervals for GET /events */
	events?: EventOptions;
}

export interface Example {
	app: Application;
	router: ExampleRouter;
	rooms: ChatRooms;
	streams: EventStreams;
}

export function createExampleApp({ chatToken, events: eventOptions }: ExampleOptions): Example {
	const rooms = createChatRooms();
	const events = createEventsHandler(eventOptions);
	const router = buildRouter({ chatToken, rooms, events: events.handler });
	const app = createApp({
		config: buildConfig(),
		providers: [httpProvider(router)],
	});
	return { app, router, rooms, streams: events.streams };
}
