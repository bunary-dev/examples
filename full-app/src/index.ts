/**
 * Full App Example
 *
 * Boots the app with DATABASE_PATH and JWT_SECRET from the environment (dev
 * defaults outside production) and serves it. `bun run dev` migrates the
 * database first (`bun run db:setup`).
 */

import { serve } from "@bunary/http/provider";
import { createFullApp } from "./app.js";
import { loadOptions } from "./config.js";

const options = loadOptions();
const { app } = createFullApp(options);
await app.boot();
const server = serve(app);

const base = `http://localhost:${server.port}`;
console.log(`🚀 Notes API running on ${base} (database: ${options.databasePath})`);
// Never log passwords or tokens, even demo ones: the walkthrough is in README.md.
console.log(`Try it: README.md, "Walkthrough". Endpoints: curl ${base}/`);
