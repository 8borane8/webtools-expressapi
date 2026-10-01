import { contentType } from "@std/media-types";
import { type Cookie, setCookie } from "@std/http/cookie";

declare const bodyType: unique symbol;

/** A `Response` that remembers the type of its JSON body, so `HttpClient` can infer it. Created by `res.json()`. */
export type TypedResponse<T = unknown> = Response & { readonly [bodyType]?: T };

/** Builds the response of a request. Setters are chainable; `send`, `json`, `redirect` and `sendFile` finish it. */
export class HttpResponse {
	private readonly headers = new Headers();
	private code: number = 200;

	/**
	 * Sets the status code, 200 by default.
	 *
	 * @param code The HTTP status code.
	 */
	public status(code: number): HttpResponse {
		this.code = code;
		return this;
	}

	/**
	 * Sets a header, replacing any previous value.
	 *
	 * @param name The header name.
	 * @param value The header value.
	 */
	public setHeader(name: string, value: string): HttpResponse {
		this.headers.set(name, value);
		return this;
	}

	/**
	 * Reads a header set on this response.
	 *
	 * @param name The header name.
	 * @returns The value, or `null` when the header is not set.
	 */
	public getHeader(name: string): string | null {
		return this.headers.get(name);
	}

	/**
	 * Adds a `Set-Cookie` header. Can be called several times to set several cookies.
	 *
	 * @example
	 * ```ts
	 * res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "Lax", maxAge: 3600 });
	 * ```
	 * @param name The cookie name.
	 * @param value The cookie value.
	 * @param options Cookie attributes: `httpOnly`, `secure`, `sameSite`, `maxAge`, `path`, `domain`...
	 */
	public cookie(name: string, value: string, options: Omit<Cookie, "name" | "value"> = {}): HttpResponse {
		setCookie(this.headers, { name, value, ...options });
		return this;
	}

	/**
	 * Sets `Content-Type` from a file extension (`"html"`) or a media type (`"text/html"`), `application/octet-stream`
	 * when unknown.
	 *
	 * @param type The extension or media type.
	 */
	public type(type: string): HttpResponse {
		return this.setHeader("Content-Type", contentType(`.${type}`) || "application/octet-stream");
	}

	/**
	 * Sets `Content-Length`.
	 *
	 * @param size The body size in bytes.
	 */
	public size(size: number): HttpResponse {
		return this.setHeader("Content-Length", size.toString());
	}

	/**
	 * Sends a raw body with the current status and headers.
	 *
	 * @param body The body, or `null` for none.
	 */
	public send(body: BodyInit | null): Response {
		return new Response(body, { status: this.code, headers: this.headers });
	}

	/**
	 * Sends a JSON body. The type of `body` is exposed to `HttpClient`.
	 *
	 * @param body Any JSON-serializable value.
	 */
	public json<T>(body: T): TypedResponse<T> {
		return this.setHeader("Content-Type", "application/json; charset=utf-8").send(
			JSON.stringify(body),
		) as TypedResponse<T>;
	}

	/**
	 * Redirects the client.
	 *
	 * @param url The target URL.
	 * @param code The status code, 307 (temporary, method preserved) by default.
	 */
	public redirect(url: string, code: number = 307): Response {
		return this.setHeader("Location", url).status(code).send(null);
	}

	/**
	 * Streams a file, with `Content-Type` guessed from its extension and `Content-Length`. Answers a JSON 404 when
	 * the path does not exist or is not a file. The path is used as is: never build it from user input without
	 * checking it.
	 *
	 * @param path The file path on disk.
	 */
	public async sendFile(path: string): Promise<Response> {
		const stat = await Deno.stat(path).catch(() => null);
		if (!stat?.isFile) {
			return this.status(404).json({
				success: false,
				error: "404 Not Found.",
			});
		}

		const file = await Deno.open(path, { read: true });
		return this.type(path.split(".").at(-1)!).size(stat.size).send(file.readable);
	}
}
