/**
 * Chat rooms for the WebSocket route: who is in which room, and sending a
 * message to everyone in one.
 *
 * Each socket's `ws.data` carries the route params (`params.room`), the
 * request locals and the `name` the route's `upgrade` option added.
 */

import type { WebSocketData, WebSocketHandlers } from "@bunary/http";
import type { ServerWebSocket } from "bun";

export type ChatParams = { room: string };
export type ChatData = WebSocketData<Record<string, unknown>, ChatParams, { name: string }>;
export type ChatSocket = ServerWebSocket<ChatData>;

/** Messages the server sends, as JSON. */
export type ChatMessage =
	| { type: "welcome"; room: string; name: string; members: string[] }
	| { type: "joined"; room: string; name: string }
	| { type: "left"; room: string; name: string }
	| { type: "message"; room: string; from: string; text: string }
	| { type: "error"; detail: string };

export interface ChatRooms {
	join(socket: ChatSocket): void;
	leave(socket: ChatSocket): void;
	/** Send `message` to everyone in `room`, optionally except one socket. */
	broadcast(room: string, message: ChatMessage, except?: ChatSocket): void;
	/** Names of the members of `room`, in join order. */
	members(room: string): string[];
	has(room: string): boolean;
}

export function createChatRooms(): ChatRooms {
	const rooms = new Map<string, Set<ChatSocket>>();

	return {
		join(socket: ChatSocket) {
			const { room } = socket.data.params;
			let members = rooms.get(room);
			if (!members) rooms.set(room, (members = new Set()));
			members.add(socket);
		},
		leave(socket: ChatSocket) {
			const { room } = socket.data.params;
			const members = rooms.get(room);
			members?.delete(socket);
			if (members?.size === 0) rooms.delete(room);
		},
		broadcast(room: string, message: ChatMessage, except?: ChatSocket) {
			const payload = JSON.stringify(message);
			for (const socket of rooms.get(room) ?? []) {
				if (socket !== except) socket.send(payload);
			}
		},
		members(room: string) {
			return [...(rooms.get(room) ?? [])].map((socket) => socket.data.name);
		},
		has(room: string) {
			return rooms.has(room);
		},
	};
}

const send = (socket: ChatSocket, message: ChatMessage) => socket.send(JSON.stringify(message));

/** Read `{ "text": "…" }` from a client message, or null. */
function parseText(message: string | Buffer): string | null {
	try {
		const body: unknown = JSON.parse(String(message));
		if (typeof body === "object" && body !== null && "text" in body && typeof body.text === "string") {
			return body.text;
		}
	} catch {
		// fall through
	}
	return null;
}

/** The `router.ws()` handlers: open joins, message broadcasts, close leaves. */
export function chatHandlers(rooms: ChatRooms): WebSocketHandlers<ChatData> {
	return {
		open(ws) {
			const { name } = ws.data;
			const { room } = ws.data.params;
			rooms.join(ws);
			send(ws, { type: "welcome", room, name, members: rooms.members(room) });
			rooms.broadcast(room, { type: "joined", room, name }, ws);
		},
		message(ws, message) {
			const text = parseText(message);
			if (text === null) return send(ws, { type: "error", detail: 'Send JSON like {"text": "hi"}' });
			const { room } = ws.data.params;
			rooms.broadcast(room, { type: "message", room, from: ws.data.name, text });
		},
		close(ws) {
			const { room } = ws.data.params;
			rooms.leave(ws);
			rooms.broadcast(room, { type: "left", room, name: ws.data.name });
		},
	};
}
