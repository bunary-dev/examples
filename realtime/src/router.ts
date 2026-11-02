/**
 * The example's routes.
 *
 *   GET /             health, lists the endpoints
 *   WS  /chat/:room   chat room; needs the chat token (401 before the upgrade
 *                     without it, 426 for a request that isn't an upgrade)
 *   GET /events       Server-Sent Events: a `tick` counter
 */

import { createRouter, type Router } from "@bunary/http";
import { type ChatParams, type ChatRooms, chatHandlers } from "./chat.js";
import type { createEventsHandler } from "./events.js";
import { requireChatToken } from "./token.js";

export type Locals = Record<string, unknown>;
export type ExampleRouter = Router<Locals>;

const ENDPOINTS = ["WS /chat/:room", "GET /events"];

export interface RouterDeps {
	chatToken: string;
	rooms: ChatRooms;
	events: ReturnType<typeof createEventsHandler>["handler"];
}

export function buildRouter({ chatToken, rooms, events }: RouterDeps): ExampleRouter {
	const router = createRouter<Locals>();

	router.get("/", () => ({ status: "ok", message: "Realtime Example", endpoints: ENDPOINTS }));

	// Group middleware runs before the upgrade, so it can refuse the socket.
	router.group({ prefix: "/chat", middleware: [requireChatToken<Locals>(chatToken)] }, (chat) => {
		chat.ws<ChatParams, { name: string }>("/:room", chatHandlers(rooms), {
			// Merged into ws.data next to `params` and `locals`
			upgrade: (ctx) => ({ name: ctx.query.get("name") || "anonymous" }),
		});
	});

	router.get("/events", events);

	return router;
}
