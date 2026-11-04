# Realtime Example

WebSockets and Server-Sent Events with **`@bunary/http`**: a chat room on `router.ws()` and a
counter stream on `sse()`, on a router mounted on a `@bunary/core` Application.

Targets `@bunary/http` **^0.7.2** and `@bunary/core` **^0.4.0** (Bun ≥ 1.4.0). Those two are the
only dependencies.

## What it shows

- **`router.ws("/chat/:room", …)`** (on a route group): a tiny chat room. `open` joins the room
  and sends a welcome with the current members, `message` broadcasts `{ "text": "…" }` to everyone
  in the room (sender included), `close` leaves and tells the others. Clients in other rooms get
  nothing.
- **`ws.data`**: the route params (`ws.data.params.room`), the request `locals`, and the `name`
  the route's `upgrade(ctx)` option adds from `?name=`.
- **Middleware before the upgrade**: the `/chat` group's `requireChatToken()` answers a client
  without the chat token with **401** (a problem response), so it never gets a socket. A plain
  `GET /chat/x` that isn't a WebSocket upgrade gets **426 Upgrade Required**.
- **`sse()`**: `GET /events` streams `tick` events with `event:`, `id:` and JSON `data:`, sends
  a `: ping` keep-alive comment, continues after `Last-Event-ID` on reconnect, and clears its
  timer when the client disconnects (`stream.signal`).
- **`serve(app)`** from `@bunary/http/provider`: it calls `router.listen()`, which wires the
  router's `websocket` handler into `Bun.serve`.

## Structure

```
src/
├── index.ts     # Entry point: chat token from env, boots and serves
├── app.ts       # createApp() with httpProvider(router)
├── config.ts    # defineConfig(): app name and http.port
├── router.ts    # Routes: GET /, WS /chat/:room (token group), GET /events
├── chat.ts      # Rooms and the open/message/close handlers
├── events.ts    # The sse() counter stream
└── token.ts     # CHAT_TOKEN via env() and the requireChatToken() middleware
```

## Pattern

```typescript
// router.ts: group middleware runs before the upgrade
router.group({ prefix: "/chat", middleware: [requireChatToken(chatToken)] }, (chat) => {
  chat.ws<{ room: string }, { name: string }>("/:room", {
    open(ws)          { rooms.join(ws); /* ws.data.params.room, ws.data.name */ },
    message(ws, msg)  { rooms.broadcast(ws.data.params.room, /* … */); },
    close(ws)         { rooms.leave(ws); },
  }, {
    upgrade: (ctx) => ({ name: ctx.query.get("name") || "anonymous" }), // merged into ws.data
  });
});

// events.ts
router.get("/events", (ctx) =>
  sse(ctx, (stream) => {
    const timer = setInterval(() => stream.send({ event: "tick", id: String(++count), data: { count } }), 1000);
    stream.signal.addEventListener("abort", () => clearInterval(timer)); // client disconnected
  }, { keepAlive: 15_000 }),
);
```

## Running

```bash
bun install

bun run dev        # hot reload
bun run start      # or start normally

bun test           # tests (real server on an ephemeral port)
bun run typecheck  # tsc --noEmit
```

The server listens on port 3000 (set `PORT` to change it).

### Chat token

Opening a chat socket needs the token in `CHAT_TOKEN`, sent as `?token=…` (browsers can't set
headers on a WebSocket) or as `Authorization: Bearer …`. Outside production `CHAT_TOKEN` defaults
to `DEV_CHAT_TOKEN` in `src/token.ts` (`dev-only-chat-token`). That default is public, so with
`APP_ENV` (or `NODE_ENV`) set to `production` an unset `CHAT_TOKEN` makes startup throw.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check, lists the endpoints |
| WS | `/chat/:room?token=…&name=…` | Chat room; 401 without the token, 426 without `Upgrade: websocket` |
| GET | `/events` | `text/event-stream` of `tick` events, one per second |

### Chat messages

Clients send `{ "text": "hi" }`. The server sends JSON:

| `type` | To | Fields |
|--------|----|--------|
| `welcome` | the client that joined | `room`, `name`, `members` |
| `joined` | the others in the room | `room`, `name` |
| `message` | everyone in the room | `room`, `from`, `text` |
| `left` | the others in the room | `room`, `name` |
| `error` | the sender of a malformed message | `detail` |

### Events

```
event: tick
id: 1
data: {"count":1,"time":"2026-01-01T00:00:00.000Z"}

: ping
```

## Example Requests

```bash
# SSE: -N turns off curl's buffering
curl -N http://localhost:3000/events

# WebSocket: two terminals in the same room (token: see "Chat token" above)
bunx wscat -c "ws://localhost:3000/chat/lobby?name=ada&token=$CHAT_TOKEN"
bunx wscat -c "ws://localhost:3000/chat/lobby?name=alan&token=$CHAT_TOKEN"
> {"text": "hello"}
```

In a browser:

```js
const ws = new WebSocket(`ws://localhost:3000/chat/lobby?name=ada&token=${token}`);
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ text: "hello" }));

const events = new EventSource("http://localhost:3000/events");
events.addEventListener("tick", (e) => console.log(e.lastEventId, JSON.parse(e.data)));
```

## Notes

- Rooms live in memory in one process; a room is dropped when its last member leaves.
- A token in the query string can end up in access logs. That is the usual trade-off for browser
  WebSockets; use a short-lived token in real use.
