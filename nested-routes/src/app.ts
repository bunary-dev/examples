/**
 * The @bunary/core Application, with the router mounted by `httpProvider`.
 */

import { type Application, createApp } from "@bunary/core";
import type { Router } from "@bunary/http";
import { httpProvider } from "@bunary/http/provider";
import config from "../bunary.config.js";

export function createExampleApp(router: Router): Application {
	return createApp({ config, providers: [httpProvider(router)] });
}
