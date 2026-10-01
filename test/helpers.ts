import { assertThrows } from "@std/assert";
import { type HttpServer, type Schema, ValidationError } from "@/mod.ts";

/** Sends a request straight to the server, without opening a port. */
export function call(server: HttpServer, path: string, init?: RequestInit): Promise<Response> {
	return server.fetch(new Request(`http://localhost${path}`, init));
}

/** Request options sending `body` as JSON. */
export function jsonInit(body: unknown, method = "POST"): RequestInit {
	return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

/** Asserts that the schema rejects every value with a `ValidationError`. */
export function rejects(schema: Schema, values: unknown[]): void {
	for (const value of values) assertThrows(() => schema.parse(value), ValidationError);
}
