/**
 * The greeting printed by `bunary hello`. Pure: the caller passes the date,
 * so it can be tested without a real clock.
 */

export interface GreetingOptions {
	/** Show the time in UTC instead of the local time zone */
	utc?: boolean;
}

/**
 * `Hello, <name>!` plus the date and time, formatted with `Intl.DateTimeFormat`
 * (en-AU, 24-hour clock, short zone name).
 *
 * @example
 * ```ts
 * formatGreeting("Paul", new Date());
 * // Hello, Paul!
 * // It's Tuesday, 3 November 2026, 14:05:09 AEDT
 * ```
 */
export function formatGreeting(name: string | undefined, date: Date, options: GreetingOptions = {}): string {
	const parts = new Intl.DateTimeFormat("en-AU", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		timeZoneName: "short",
		timeZone: options.utc ? "UTC" : undefined,
	}).formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

	const day = `${part("weekday")}, ${part("day")} ${part("month")} ${part("year")}`;
	const time = `${part("hour")}:${part("minute")}:${part("second")} ${part("timeZoneName")}`;
	return `Hello, ${name || "world"}!\nIt's ${day}, ${time}`;
}
