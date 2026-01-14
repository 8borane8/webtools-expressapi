import type { HttpMethods } from "./methods.ts";

// deno-lint-ignore no-explicit-any
export type DataDefault = any;

export type RouteTypes = {
	// deno-lint-ignore no-explicit-any
	query?: Record<string, any>;
	// deno-lint-ignore no-explicit-any
	params?: Record<string, any>;
	// deno-lint-ignore no-explicit-any
	body?: any;
};

export type RouteTypesDefault = {
	query: Record<string, string | undefined>;
	params: Record<string, string | undefined>;
	// deno-lint-ignore no-explicit-any
	body: any;
};

type ResolvedRouteTypes<TRouteTypes extends RouteTypes> = {
	query: TRouteTypes["query"] extends undefined ? RouteTypesDefault["query"]
		: TRouteTypes["query"];
	params: TRouteTypes["params"] extends undefined ? RouteTypesDefault["params"]
		: TRouteTypes["params"];
	body: TRouteTypes["body"] extends undefined ? RouteTypesDefault["body"]
		: TRouteTypes["body"];
};

export class HttpRequest<TData = DataDefault, TRouteTypes extends RouteTypes = RouteTypesDefault> {
	public readonly query: ResolvedRouteTypes<TRouteTypes>["query"] = {};
	public readonly params: ResolvedRouteTypes<TRouteTypes>["params"] = {};

	public readonly cookies: Record<string, string> = {};
	public readonly ip: string | null = null;

	public data: TData = Object.create(null);

	constructor(
		public readonly url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		public body: ResolvedRouteTypes<TRouteTypes>["body"],
		public readonly raw: Request,
	) {
		if (this.headers.has("cookie")) {
			const cookie = this.headers.get("cookie")!;
			cookie.split(";").forEach((cookie) => {
				const parts = cookie.trim().split("=");
				if (parts.length === 2) {
					this.cookies[parts[0]] = parts[1];
				}
			});
		}

		if (this.headers.has("x-forwarded-for")) {
			const xForwardedFor = this.headers.get("x-forwarded-for")!;
			this.ip = xForwardedFor.split(",")[0].trim();
		}
	}
}
