/**
 * A class for building HTTP responses.
 * @module HttpResponse
 */

import { contentType } from "@std/media-types";

/**
 * A class for building HTTP responses.
 * @class HttpResponse
 */
export class HttpResponse {
	private readonly headers: Map<string, string> = new Map();
	private code: number = 200;

	/**
	 * Set a response header.
	 * @method setHeader
	 * @param {string} name - The header name.
	 * @param {string} value - The header value.
	 */
	public setHeader(name: string, value: string): void {
		this.headers.set(name, value);
	}

	/**
	 * Set the response status code.
	 * @method status
	 * @param {number} code - The status code.
	 * @returns {HttpResponse} The current instance of HttpResponse.
	 */
	public status(code: number): HttpResponse {
		this.code = code;
		return this;
	}

	/**
	 * Send a text response.
	 * @method send
	 * @param {string} text - The text to send.
	 * @returns {Response} The response object.
	 */
	public send(text: string | null): Response {
		return new Response(text, { status: this.code, headers: this.headers });
	}

	/**
	 * Send a JSON response.
	 * @method json
	 * @param {object} object - The object to send as JSON.
	 * @returns {Response} The response object.
	 */
	public json(object: object): Response {
		this.setHeader("Content-Type", "application/json");

		return new Response(JSON.stringify(object), {
			status: this.code,
			headers: this.headers,
		});
	}

	/**
	 * Send a redirect response.
	 * @method redirect
	 * @param {string} url - The URL to redirect to.
	 * @param {number} code - The Code used to redirect.
	 * @returns {Response} The response object.
	 */
	public redirect(url: string, code: number = 307): Response {
		this.code = code;
		this.setHeader("Location", url);
		return new Response(null, { status: this.code, headers: this.headers });
	}

	/**
	 * Send a file as a response.
	 * @method sendFile
	 * @param {string} path - The path to the file to send.
	 * @returns {Response} The response object.
	 */
	public sendFile(path: string): Response {
		this.setHeader(
			"Content-Type",
			contentType(`.${path.split(".").at(-1)}`) ||
				"application/octet-stream",
		);
		this.setHeader("Content-Length", Deno.statSync(path).size.toString());

		const file = Deno.openSync(path, { read: true });
		return new Response(file.readable, {
			status: this.code,
			headers: this.headers,
		});
	}
}
