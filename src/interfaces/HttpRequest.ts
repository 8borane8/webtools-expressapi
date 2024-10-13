/**
 * Object representing an incoming HTTP request.
 * @module HttpRequest
 */

import type { HttpMethods } from "./HttpMethods.ts";

/**
 * @typedef {Object} HttpRequest - Object representing an incoming HTTP request.
 * @property {string} url - The request URL.
 * @property {HttpMethods} method - The HTTP method of the request.
 * @property {Headers} headers - The headers of the request.
 * @property {string|object|null} body - The body of the request.
 * @property {Request} raw - The raw request.
 * @property {Map<string, string>} query - The query parameters of the request.
 * @property {Map<string, string>} params - The route parameters of the request.
 */
export class HttpRequest {
	// deno-lint-ignore no-explicit-any
	public readonly data: any = {};

	public readonly query: Map<string, string> = new Map();
	public readonly params: Map<string, string> = new Map();

	constructor(
		public url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		// deno-lint-ignore no-explicit-any
		public readonly body: any,
		public readonly raw: Request,
	) {}
}
