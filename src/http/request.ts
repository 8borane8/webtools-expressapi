import { getCookies } from "@std/http/cookie";
import type { DefaultContext, RequestContext } from "./context.ts";

/**
 * An incoming request, as seen by handlers and middlewares. `query`, `params` and `body` are typed by the route's
 * schemas, and `data` by the middlewares registered before it.
 */
export class HttpRequest<TCtx extends RequestContext = DefaultContext> {
	// No prototype: `req.query.constructor` is `undefined` unless the client sent it.
	/** Query string values. Replaced by the parsed result when the route has a `query` schema. */
	public query: TCtx["query"] = Object.create(null);
	/** URL `:params`, URI-decoded. Replaced by the parsed result when the route has a `params` schema. */
	public params: TCtx["params"] = Object.create(null);

	/** Data shared between middlewares and the handler. */
	public data: TCtx["data"] = Object.create(null);

	private parsedCookies?: Partial<Record<string, string>>;

	/**
	 * Creates the request handed to handlers. Done by the server, not meant to be called directly.
	 *
	 * @param path The normalized pathname, without the query string nor trailing slash.
	 * @param method The HTTP method.
	 * @param headers The request headers.
	 * @param body The parsed body, according to its content type. Replaced by the parsed result when the route has a
	 * `body` schema.
	 * @param ip The client IP, `null` when unknown.
	 * @param raw The underlying request. Its body is consumed once `body` is parsed.
	 */
	constructor(
		public readonly path: string,
		public readonly method: string,
		public readonly headers: Headers,
		public body: TCtx["body"],
		public readonly ip: string | null,
		public readonly raw: Request,
	) {}

	/** Cookies sent by the client, parsed on first access. Values are not URI-decoded. */
	public get cookies(): Partial<Record<string, string>> {
		return this.parsedCookies ??= getCookies(this.headers);
	}
}
