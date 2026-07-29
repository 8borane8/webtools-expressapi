import type { ChainAdds, Middleware, ValidateChain } from "./middleware.ts";
import { type CorsRules, mergeCorsRules } from "./cors.ts";
import { StringHelper } from "../helpers/string.ts";
import type { Schemas } from "../http/context.ts";
import type { AnyListener } from "./listener.ts";
import { HttpMethods } from "../http/methods.ts";
import { dataMarker } from "./registry.ts";
import type { Route } from "./route.ts";
import type {
	BodyOf,
	DataMarker,
	InferData,
	InferRoutes,
	ListenerReturn,
	PrefixRoutes,
	RouteEntry,
	RouteMarker,
	TypedListener,
} from "./registry.ts";

type RouteArgs<
	TData,
	TUrl extends string,
	TSchemas extends Schemas,
	TReturn,
	TMws extends readonly unknown[] = readonly [],
> = [
	url: TUrl,
	requestListener: TypedListener<TData & ChainAdds<TMws>, TSchemas, TUrl, TReturn>,
	middlewares?: ValidateChain<TData, TMws>,
	schemas?: TSchemas,
];

type TypedRoute<
	TData,
	TMethod extends HttpMethods,
	TUrl extends string,
	TSchemas extends Schemas,
	TReturn,
	TMws extends readonly unknown[] = readonly [],
> = {
	url: TUrl;
	method: TMethod;
	requestListener: TypedListener<TData & ChainAdds<TMws>, TSchemas, TUrl, TReturn>;
	middlewares?: ValidateChain<TData, TMws>;
	schemas?: TSchemas;
	cors?: CorsRules;
};

type Registered<TSelf, TMethod extends HttpMethods, TUrl extends string, TSchemas extends Schemas, TReturn> =
	& TSelf
	& RouteMarker<RouteEntry<TMethod, TUrl, TSchemas, BodyOf<TReturn>>>;

export class Router<TData = Record<never, never>> {
	declare readonly [dataMarker]: TData;

	protected readonly routes: Map<HttpMethods, Route[]> = new Map();
	protected readonly middlewares: AnyListener[] = [];

	protected corsRules: CorsRules = {};

	constructor(protected readonly prefix: string = "/") {
		for (const method of Object.values(HttpMethods)) {
			this.routes.set(method, []);
		}
	}

	public addRoute<
		TMethod extends HttpMethods,
		TUrl extends string,
		TSchemas extends Schemas,
		TReturn extends ListenerReturn,
		TMws extends readonly unknown[] = readonly [],
	>(
		route: TypedRoute<InferData<this>, TMethod, TUrl, TSchemas, TReturn, TMws>,
	): Registered<this, TMethod, TUrl, TSchemas, TReturn> {
		this.pushRoute({
			url: route.url,
			method: route.method,
			middlewares: (route.middlewares ?? []) as AnyListener[],
			requestListener: route.requestListener as AnyListener,
			schemas: route.schemas,
			cors: route.cors,
		});
		return this as Registered<this, TMethod, TUrl, TSchemas, TReturn>;
	}

	private pushRoute(route: Route): void {
		const routes = this.routes.get(route.method)!;

		const prefixedUrl = StringHelper.normalizePath(this.prefix, route.url);
		if (routes.some((r) => r.url === prefixedUrl)) {
			throw new Error(`The route '${prefixedUrl}' is already registered for the '${route.method}' method.`);
		}

		routes.push({ ...route, url: prefixedUrl });
	}

	public get<
		TUrl extends string,
		TSchemas extends Schemas,
		TReturn extends ListenerReturn,
		TMws extends readonly unknown[] = readonly [],
	>(
		...args: RouteArgs<InferData<this>, TUrl, TSchemas, TReturn, TMws>
	): Registered<this, "GET", TUrl, TSchemas, TReturn> {
		return this.register(HttpMethods.GET, args);
	}

	public post<
		TUrl extends string,
		TSchemas extends Schemas,
		TReturn extends ListenerReturn,
		TMws extends readonly unknown[] = readonly [],
	>(
		...args: RouteArgs<InferData<this>, TUrl, TSchemas, TReturn, TMws>
	): Registered<this, "POST", TUrl, TSchemas, TReturn> {
		return this.register(HttpMethods.POST, args);
	}

	public put<
		TUrl extends string,
		TSchemas extends Schemas,
		TReturn extends ListenerReturn,
		TMws extends readonly unknown[] = readonly [],
	>(
		...args: RouteArgs<InferData<this>, TUrl, TSchemas, TReturn, TMws>
	): Registered<this, "PUT", TUrl, TSchemas, TReturn> {
		return this.register(HttpMethods.PUT, args);
	}

	public patch<
		TUrl extends string,
		TSchemas extends Schemas,
		TReturn extends ListenerReturn,
		TMws extends readonly unknown[] = readonly [],
	>(
		...args: RouteArgs<InferData<this>, TUrl, TSchemas, TReturn, TMws>
	): Registered<this, "PATCH", TUrl, TSchemas, TReturn> {
		return this.register(HttpMethods.PATCH, args);
	}

	public delete<
		TUrl extends string,
		TSchemas extends Schemas,
		TReturn extends ListenerReturn,
		TMws extends readonly unknown[] = readonly [],
	>(
		...args: RouteArgs<InferData<this>, TUrl, TSchemas, TReturn, TMws>
	): Registered<this, "DELETE", TUrl, TSchemas, TReturn> {
		return this.register(HttpMethods.DELETE, args);
	}

	// deno-lint-ignore no-explicit-any
	private register(method: HttpMethods, [url, requestListener, middlewares = [], schemas]: any): any {
		this.pushRoute({
			url,
			method,
			middlewares: middlewares as AnyListener[],
			requestListener: requestListener as AnyListener,
			schemas,
		});
		return this;
	}

	public cors(rules: CorsRules): this {
		this.corsRules = mergeCorsRules(this.corsRules, rules);
		return this;
	}

	public use<TPrefix extends string, TRouter extends Router>(
		prefix: TPrefix,
		router: MountableRouter<this, TRouter>,
	): this & RouteMarker<PrefixRoutes<InferRoutes<TRouter>, TPrefix>>;

	public use<TRouter extends Router>(
		router: MountableRouter<this, TRouter>,
	): this & RouteMarker<PrefixRoutes<InferRoutes<TRouter>, "/">>;

	public use<TAdds, TNeeds>(
		middleware: ApplicableMiddleware<this, TAdds, TNeeds>,
	): this & DataMarker<TAdds>;
	public use(mpr: AnyListener | string | Router, router?: Router): this {
		if (typeof mpr === "string" && router) {
			this.mountRouter(router, mpr);
			return this;
		}

		if (mpr instanceof Router) {
			this.mountRouter(mpr);
			return this;
		}

		if (typeof mpr === "function") {
			this.middlewares.push(mpr);
			return this;
		}

		return this;
	}

	private mountRouter(router: Router, prefix = "/"): void {
		for (const routes of router.routes.values()) {
			for (const route of routes) {
				this.pushRoute({
					...route,
					url: StringHelper.normalizePath(prefix, route.url),
					middlewares: [...router.middlewares, ...route.middlewares],
					cors: mergeCorsRules(this.corsRules, router.corsRules, route.cors),
				});
			}
		}
	}
}

type MountableRouter<TParent, TRouter> = InferData<TParent> extends InferData<TRouter> ? TRouter
	: "This router expects context data the parent does not provide. Register the middleware that supplies it before use().";

type ApplicableMiddleware<TParent, TAdds, TNeeds> = InferData<TParent> extends TNeeds ? Middleware<TAdds, TNeeds>
	: "This middleware depends on context data that is missing. Register the middleware that provides it first.";
