/**
 * Realtime Example
 *
 * Boots the app with the chat token from the environment (CHAT_TOKEN; a dev
 * default outside production) and serves it.
 */

import { serve } from "@bunary/http/provider";
import { createExampleApp } from "./app.js";
import { loadChatToken } from "./token.js";

const { app } = createExampleApp({ chatToken: loadChatToken() });
await app.boot();
const server = serve(app);

const http = `http://localhost:${server.port}`;
const ws = `ws://localhost:${server.port}`;
console.log(`🚀 Server running on ${http}`);
// Never log the chat token, even the dev one: README.md ("Chat token") says where it comes from.
console.log(`
  curl -N ${http}/events
  bunx wscat -c "${ws}/chat/lobby?name=ada&token=<chat token>"
`);
