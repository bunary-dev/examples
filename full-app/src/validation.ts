/**
 * Request validators for the routes that take input.
 *
 * Route schemas accept any Standard Schema validator (zod, valibot, …) or a
 * plain function. These are plain functions, so the example needs no
 * validation library: each returns the typed value or throws core's
 * `ValidationError` listing every issue, which the router answers with a 422
 * problem document. Messages never echo the input (it may be a password).
 */

import { ValidationError, type ValidationIssue } from "@bunary/core";
import type { PathParams } from "@bunary/http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 10_000;

export interface RegisterInput {
	name: string;
	email: string;
	password: string;
}

export interface CreateNoteInput {
	title: string;
	body: string | null;
}

export type UpdateNoteInput = Partial<CreateNoteInput>;

function jsonObject(input: unknown): Record<string, unknown> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new ValidationError([{ path: "(root)", message: "Expected a JSON object" }]);
	}
	return input as Record<string, unknown>;
}

function done<T>(issues: ValidationIssue[], value: T): T {
	if (issues.length > 0) throw new ValidationError(issues);
	return value;
}

function checkTitle(value: unknown, issues: ValidationIssue[]): string {
	if (typeof value !== "string" || value.trim() === "") {
		issues.push({ path: "title", message: "Required: a non-empty string" });
	} else if (value.length > MAX_TITLE_LENGTH) {
		issues.push({ path: "title", message: `At most ${MAX_TITLE_LENGTH} characters` });
	}
	return typeof value === "string" ? value.trim() : "";
}

function checkBody(value: unknown, issues: ValidationIssue[]): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== "string") {
		issues.push({ path: "body", message: "Expected a string or null" });
		return null;
	}
	if (value.length > MAX_BODY_LENGTH) issues.push({ path: "body", message: `At most ${MAX_BODY_LENGTH} characters` });
	return value;
}

/** POST /register */
export function registerBody(input: unknown): RegisterInput {
	const { name, email, password } = jsonObject(input);
	const issues: ValidationIssue[] = [];
	if (typeof name !== "string" || name.trim() === "") issues.push({ path: "name", message: "Required: a non-empty string" });
	if (typeof email !== "string" || !EMAIL.test(email)) issues.push({ path: "email", message: "Expected an email address" });
	if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
		issues.push({ path: "password", message: `Expected a string of at least ${MIN_PASSWORD_LENGTH} characters` });
	}
	return done(issues, { name: String(name).trim(), email: String(email), password: String(password) });
}

/** POST /notes */
export function createNoteBody(input: unknown): CreateNoteInput {
	const values = jsonObject(input);
	const issues: ValidationIssue[] = [];
	const title = checkTitle(values.title, issues);
	const body = checkBody(values.body, issues);
	return done(issues, { title, body });
}

/** PATCH /notes/:id: `title` and/or `body` */
export function updateNoteBody(input: unknown): UpdateNoteInput {
	const values = jsonObject(input);
	const issues: ValidationIssue[] = [];
	const update: UpdateNoteInput = {};
	if (values.title === undefined && values.body === undefined) {
		issues.push({ path: "(root)", message: "Expected at least one of title, body" });
	}
	if (values.title !== undefined) update.title = checkTitle(values.title, issues);
	if (values.body !== undefined) update.body = checkBody(values.body, issues);
	return done(issues, update);
}

/** `:id` in /notes/:id: a positive integer */
export function noteParams(params: PathParams): { id: number } {
	const id = Number(params.id);
	return done(Number.isSafeInteger(id) && id > 0 ? [] : [{ path: "id", message: "Expected a positive integer" }], { id });
}
