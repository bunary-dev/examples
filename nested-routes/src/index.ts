/**
 * Nested Routes Example
 *
 * Organizes routes into nested route groups (see src/router.ts), mounts the
 * router on a @bunary/core Application and serves it.
 */

import { serve } from "@bunary/http/provider";
import { createExampleApp } from "./app.js";
import { buildRouter } from "./router.js";

const router = buildRouter();
const app = await createExampleApp(router).boot();
const server = serve(app);

const base = `http://localhost:${server.port}`;
console.log(`🚀 Server running on ${base}`);
console.log(`
Try these endpoints:
  GET  ${base}${router.route("health")}
  GET  ${base}${router.route("api.users.index")}
  GET  ${base}${router.route("api.users.show", { user: 1 })}
  GET  ${base}${router.route("api.users.posts.index", { user: 1 })}
  GET  ${base}${router.route("api.users.posts.show", { user: 1, post: 2 })}
  GET  ${base}${router.route("api.posts.index")}
  GET  ${base}${router.route("api.posts.index", { authorId: 1 })}
`);
