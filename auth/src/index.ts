/**
 * Auth Example
 *
 * Boots the app with the demo users and the secrets from the environment
 * (JWT_SECRET, SESSION_SECRET; dev defaults outside production) and serves it.
 */

import { serve } from "@bunary/http/provider";
import { createExampleApp } from "./app.js";
import { loadSecrets } from "./secrets.js";
import { createUserStore, demoUsers } from "./users.js";

const { app } = createExampleApp({ users: await createUserStore(demoUsers), secrets: loadSecrets() });
await app.boot();
const server = serve(app);

const base = `http://localhost:${server.port}`;
const [ada] = demoUsers;
console.log(`🚀 Server running on ${base}`);
console.log(`
Demo user: ${ada?.email} / ${ada?.password}

  curl -X POST ${base}/login -H "Content-Type: application/json" \\
    -d '{"email": "${ada?.email}", "password": "${ada?.password}"}'
  curl ${base}/me -H "Authorization: Bearer <token>"
`);
