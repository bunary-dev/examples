import { expect } from "bun:test";
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

/**
 * Assert that a response is the RFC 9457 problem+json 404 the router renders
 * for a thrown `NotFoundError`.
 */
export async function expectNotFoundProblem(response: JsonResponse, detail: string): Promise<void> {
	expect(response.status).toBe(404);
	expect(response.headers.get("content-type")).toStartWith("application/problem+json");
	expect(await response.json()).toMatchObject({ status: 404, detail });
}
