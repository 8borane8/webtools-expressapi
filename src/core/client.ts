import type { ExtractParams } from "../http/context.ts";
import type { RouteMarker } from "../routing/registry.ts";
import type { Schema } from "../validation/base.ts";

type NormalizeRoutes<T> = T extends RouteMarker<infer TRoutes> ? TRoutes : T;

type RoutesOf<T, TMethod extends string> = TMethod extends keyof NormalizeRoutes<T> ? NormalizeRoutes<T>[TMethod]
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

export type HttpClientOptions = {
	baseUrl: string;
	headers?: Record<string, string>;
	fetch?: typeof fetch;
};

type RawInput = {
	params?: Record<string, unknown>;
	query?: Record<string, unknown>;
	body?: unknown;
	headers?: Record<string, string>;
};

export class HttpClientError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: unknown,
		public readonly url: string,
	) {
		super(`Request to ${url} failed with status ${status}.`);
		this.name = "HttpClientError";
	}
}

export class HttpClient<TRoutes> {
	private readonly fetchImpl: typeof fetch;
	private readonly baseUrl: string;

	constructor(private readonly options: HttpClientOptions) {
		this.fetchImpl = options.fetch ?? globalThis.fetch;
		this.baseUrl = options.baseUrl.replace(/\/+$/, "");
	}

	public get<TUrl extends RouteUrls<TRoutes, "GET">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "GET", TUrl>
	): Promise<ClientResponse<TRoutes, "GET", TUrl>> {
		return this.request("GET", url, args[0]);
	}

	public post<TUrl extends RouteUrls<TRoutes, "POST">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "POST", TUrl>
	): Promise<ClientResponse<TRoutes, "POST", TUrl>> {
		return this.request("POST", url, args[0]);
	}

	public put<TUrl extends RouteUrls<TRoutes, "PUT">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "PUT", TUrl>
	): Promise<ClientResponse<TRoutes, "PUT", TUrl>> {
		return this.request("PUT", url, args[0]);
	}

	public patch<TUrl extends RouteUrls<TRoutes, "PATCH">>(
		url: TUrl,
		...args: ClientArgs<TRoutes, "PATCH", TUrl>
	): Promise<ClientResponse<TRoutes, "PATCH", TUrl>> {
		return this.request("PATCH", url, args[0]);
	}

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

		const headers: Record<string, string> = { ...this.options.headers, ...input?.headers };
		const hasBody = input?.body !== undefined;
		if (hasBody) headers["Content-Type"] = "application/json";

		const response = await this.fetchImpl(url, {
			method,
			headers,
			body: hasBody ? JSON.stringify(input.body) : undefined,
		});

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
		let path = urlTemplate;

		if (input?.params) {
			for (const [key, value] of Object.entries(input.params)) {
				path = path.replace(`:${key}`, encodeURIComponent(String(value)));
			}
		}

		if (!input?.query) return path;

		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(input.query)) {
			if (value !== undefined && value !== null) query.append(key, String(value));
		}

		const queryString = query.toString();
		return queryString ? `${path}?${queryString}` : path;
	}
}
