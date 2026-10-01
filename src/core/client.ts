import type { ExtractParams } from "../http/context.ts";
import type { InferRoutes } from "../routing/types.ts";
import type { Schema } from "../validation/base.ts";

type RoutesOf<T, TMethod extends string> = TMethod extends keyof InferRoutes<T> ? InferRoutes<T>[TMethod]
	: Record<never, never>;

type RouteUrls<T, TMethod extends string> = keyof RoutesOf<T, TMethod> & string;

type SchemasOf<TEntry> = TEntry extends { schemas: infer TSchemas } ? TSchemas : never;

type ResponseOf<TEntry> = TEntry extends { response: infer TResponse } ? TResponse : unknown;

type ParamsInput<TParams> = [keyof TParams] extends [never] ? { params?: Record<string, string> }
	: { params: TParams };

type InputFrom<TSchemas, TUrl extends string> =
	& (TSchemas extends { params: Schema<infer P> } ? { params: P } : ParamsInput<ExtractParams<TUrl>>)
	& (TSchemas extends { query: Schema<infer Q> } ? { query: Q } : { query?: Record<string, string> })
	& (TSchemas extends { body: Schema<infer B> } ? { body: B } : { body?: never })
	& { headers?: Record<string, string> };

type RequiredKeys<T> = {
	[K in keyof T]-?: Record<never, never> extends Pick<T, K> ? never : K;
}[keyof T];

type InputArgs<TInput> = [RequiredKeys<TInput>] extends [never] ? [input?: TInput] : [input: TInput];

type ClientArgs<T, TMethod extends string, TUrl extends RouteUrls<T, TMethod>> = InputArgs<
	InputFrom<SchemasOf<RoutesOf<T, TMethod>[TUrl]>, TUrl>
>;

type ClientResponse<T, TMethod extends string, TUrl extends RouteUrls<T, TMethod>> = ResponseOf<
	RoutesOf<T, TMethod>[TUrl]
>;

/** Options of {@linkcode HttpClient}. */
export type HttpClientOptions = {
	/** Root URL of the API, e.g. `"http://localhost:5050"`. Trailing slashes are ignored. */
	baseUrl: string;
	/** Headers sent with every request. Per-call headers override them. */
	headers?: Record<string, string>;
	/** Custom `fetch`, e.g. to call `server.fetch` directly in tests. Defaults to the global `fetch`. */
	fetch?: typeof fetch;
};

type RawInput = {
	params?: Record<string, unknown>;
	query?: Record<string, unknown>;
	body?: unknown;
	headers?: Record<string, string>;
};

/** Thrown by {@linkcode HttpClient} for every non-2xx response. */
export class HttpClientError extends Error {
	/**
	 * Creates the error for a failed request.
	 *
	 * @param status The HTTP status code.
	 * @param body The response body, parsed as JSON when possible, raw text otherwise, `null` when empty.
	 * @param url The full requested URL.
	 */
	constructor(
		public readonly status: number,
		public readonly body: unknown,
		public readonly url: string,
	) {
		super(`Request to ${url} failed with status ${status}.`);
		this.name = "HttpClientError";
	}
}

/**
 * A typed HTTP client. Give it `typeof server` and every URL, `params`, `query`, `body` and response is inferred, with
 * no code generation. Responses are parsed as JSON, and non-2xx responses throw {@linkcode HttpClientError}.
 * Bodies containing files (or a `FormData`) are sent as multipart, everything else as JSON.
 *
 * @example
 * ```ts
 * import type { AppRouter } from "./server.ts";
 *
 * const client = new HttpClient<AppRouter>({ baseUrl: "http://localhost:5050" });
 * const user = await client.get("/users/:id", { params: { id: "42" } });
 * ```
 */
export class HttpClient<TRoutes> {
	private readonly fetchImpl: typeof fetch;
	private readonly baseUrl: string;

	/**
	 * Creates a client for one API.
	 *
	 * @param options Client options, see {@linkcode HttpClientOptions}.
	 */
	constructor(private readonly options: HttpClientOptions) {
		this.fetchImpl = options.fetch || globalThis.fetch.bind(globalThis);
		this.baseUrl = options.baseUrl.replace(/\/+$/, "");
	}

	/**
	 * Sends a `GET` request to a route declared on the server.
	 *
	 * @param url The route pattern as declared on the server, e.g. `"/users/:id"`.
	 * @param args `params`, `query` and `headers`; required when the route needs them.
	 * @returns The parsed response body, typed from the route.
	 * @throws {HttpClientError} On a non-2xx response.
	 */
	public get<TUrl extends RouteUrls<TRoutes, "GET">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "GET", TUrl>
	): Promise<ClientResponse<TRoutes, "GET", TUrl>> {
		return this.request("GET", url, args[0]);
	}

	/**
	 * Sends a `POST` request to a route declared on the server.
	 *
	 * @param url The route pattern as declared on the server, e.g. `"/users"`.
	 * @param args `params`, `query`, `body` and `headers`; required when the route needs them.
	 * @returns The parsed response body, typed from the route.
	 * @throws {HttpClientError} On a non-2xx response.
	 */
	public post<TUrl extends RouteUrls<TRoutes, "POST">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "POST", TUrl>
	): Promise<ClientResponse<TRoutes, "POST", TUrl>> {
		return this.request("POST", url, args[0]);
	}

	/**
	 * Sends a `PUT` request to a route declared on the server.
	 *
	 * @param url The route pattern as declared on the server, e.g. `"/users/:id"`.
	 * @param args `params`, `query`, `body` and `headers`; required when the route needs them.
	 * @returns The parsed response body, typed from the route.
	 * @throws {HttpClientError} On a non-2xx response.
	 */
	public put<TUrl extends RouteUrls<TRoutes, "PUT">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "PUT", TUrl>
	): Promise<ClientResponse<TRoutes, "PUT", TUrl>> {
		return this.request("PUT", url, args[0]);
	}

	/**
	 * Sends a `PATCH` request to a route declared on the server.
	 *
	 * @param url The route pattern as declared on the server, e.g. `"/users/:id"`.
	 * @param args `params`, `query`, `body` and `headers`; required when the route needs them.
	 * @returns The parsed response body, typed from the route.
	 * @throws {HttpClientError} On a non-2xx response.
	 */
	public patch<TUrl extends RouteUrls<TRoutes, "PATCH">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "PATCH", TUrl>
	): Promise<ClientResponse<TRoutes, "PATCH", TUrl>> {
		return this.request("PATCH", url, args[0]);
	}

	/**
	 * Sends a `DELETE` request to a route declared on the server.
	 *
	 * @param url The route pattern as declared on the server, e.g. `"/users/:id"`.
	 * @param args `params`, `query`, `body` and `headers`; required when the route needs them.
	 * @returns The parsed response body, typed from the route.
	 * @throws {HttpClientError} On a non-2xx response.
	 */
	public delete<TUrl extends RouteUrls<TRoutes, "DELETE">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "DELETE", TUrl>
	): Promise<ClientResponse<TRoutes, "DELETE", TUrl>> {
		return this.request("DELETE", url, args[0]);
	}

	// deno-lint-ignore no-explicit-any
	private async request(method: string, urlTemplate: string, rawInput?: unknown): Promise<any> {
		const input = rawInput as RawInput | undefined;
		const url = this.baseUrl + this.buildPath(urlTemplate, input);

		const headers = new Headers(this.options.headers);
		for (const [name, value] of Object.entries(input?.headers ?? {})) headers.set(name, value);

		const body = this.encodeBody(input?.body, headers);
		const response = await this.fetchImpl(url, { method, headers, body });

		const text = await response.text();
		let payload: unknown = null;
		if (text) {
			try {
				payload = JSON.parse(text);
			} catch {
				payload = text;
			}
		}

		if (!response.ok) throw new HttpClientError(response.status, payload, url);
		return payload;
	}

	private buildPath(urlTemplate: string, input?: RawInput): string {
		const path = urlTemplate.replace(/:([^/]+)/g, (_, name: string) => {
			const value = input?.params?.[name];
			if (value === undefined) throw new Error(`Missing param '${name}' for '${urlTemplate}'.`);
			return encodeURIComponent(String(value));
		});

		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(input?.query ?? {})) {
			if (value !== undefined && value !== null) query.append(key, String(value));
		}

		const queryString = query.toString();
		return queryString ? `${path}?${queryString}` : path;
	}

	/** JSON by default, multipart when the body is a `FormData` or contains files. */
	private encodeBody(body: unknown, headers: Headers): BodyInit | undefined {
		if (body === undefined) return undefined;
		if (body instanceof FormData) return body;

		const fields = typeof body === "object" && body !== null ? Object.entries(body) : [];
		if (!fields.some(([, value]) => value instanceof Blob)) {
			headers.set("Content-Type", "application/json");
			return JSON.stringify(body);
		}

		const form = new FormData();
		for (const [key, value] of fields) {
			if (value === undefined) continue;
			form.append(
				key,
				value instanceof Blob ? value : typeof value === "object" ? JSON.stringify(value) : String(value),
			);
		}
		return form;
	}
}
