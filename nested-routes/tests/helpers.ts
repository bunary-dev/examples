import type { Router } from "@bunary/http";

/** A Response whose JSON body the tests read loosely. */
// biome-ignore lint/suspicious/noExplicitAny: test assertions inspect arbitrary JSON
export type JsonResponse = Omit<Response, "json"> & { json(): Promise<any> };

/**
 * Send a request straight to a router, without starting a server.
 */
export function call(router: Router, method: string, path: string, body?: unknown): Promise<JsonResponse> {
	return router.fetch(
		new Request(`http://localhost${path}`, {
			method,
			...(body !== undefined && {
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		}),
	);
}
