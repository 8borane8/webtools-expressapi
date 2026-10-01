import type { ChainAdds, Middleware, MissingContext, ValidateChain } from "./middleware.ts";
import { compareRoutes, normalizePath } from "./match.ts";
import { type CorsRules, mergeCorsRules } from "./cors.ts";
import type { Schemas } from "../http/context.ts";
import type { AnyListener } from "./listener.ts";
import { HttpMethods } from "../http/methods.ts";
import { dataMarker, expectedMarker } from "./types.ts";
import type { Route } from "./route.ts";
import type {
	BodyOf,
	DataMarker,
	InferData,
	InferExpected,
	InferRoutes,
	ListenerReturn,
	PrefixRoutes,
	RouteEntry,
	RouteMarker,
	TypedListener,
} from "./types.ts";

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

/**
 * A group of routes that can be mounted on a server or another router with `use`. `TData` declares the context data
 * (`req.data`) the router expects its parent to provide through middlewares.
 *
 * @example
 * ```ts
 * const users = new Router()
 * 	.get("/", (_req, res) => res.json([]))
 * 	.get("/:id", (req, res) => res.json({ id: req.params.id }));
 *
 * const server = new HttpServer().use("/users", users);
 * ```
 */
export class Router<TData = Record<never, never>> {
	/** Type-only: the context data available to routes registered from now on. */
	declare readonly [dataMarker]: TData;
	/** Type-only: the context data this router expects its parent to provide when mounted. */
	declare readonly [expectedMarker]: TData;

	/** Routes by HTTP method, most specific first. */
	protected readonly routes: Map<string, Route[]> = new Map();
	/** Middlewares registered so far; they only apply to routes declared after them. */
	protected readonly middlewares: AnyListener[] = [];

	/** CORS rules of this router, applied to all its routes. */
	protected corsRules: CorsRules = {};

	/** Creates an empty router. */
	constructor() {
		for (const method of Object.values(HttpMethods)) {
			this.routes.set(method, []);
		}
	}

	/**
	 * Registers a route from an object. Equivalent to `get`, `post`... with one extra option: a per-route `cors`.
	 *
	 * @param route The route definition: `url`, `method`, `requestListener`, and optionally `middlewares`, `schemas`
	 * and `cors`.
	 * @throws {Error} If the route is already registered for that method.
	 */
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
			middlewares: (route.middlewares || []) as AnyListener[],
			requestListener: route.requestListener as AnyListener,
			schemas: route.schemas,
			cors: route.cors,
		});
		return this as Registered<this, TMethod, TUrl, TSchemas, TReturn>;
	}

	private pushRoute(route: Route): void {
		const routes = this.routes.get(route.method)!;

		const url = normalizePath(route.url);
		if (routes.some((r) => r.url === url)) {
			throw new Error(`The route '${url}' is already registered for the '${route.method}' method.`);
		}

		routes.push({
			...route,
			url,
			middlewares: [...this.middlewares, ...route.middlewares],
		});
		routes.sort(compareRoutes);
	}

	/**
	 * Registers a `GET` route. `HEAD` requests are answered by the same handler, without a body.
	 *
	 * The URL can contain `:params`, which are typed in `req.params`. Validation schemas narrow `req.query`,
	 * `req.params` and `req.body`, and the response type of the handler feeds `HttpClient`.
	 *
	 * @param args The URL, the handler, an optional list of route middlewares, and optional validation schemas.
	 * @throws {Error} If the route is already registered.
	 */
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

	/**
	 * Registers a `POST` route. See {@linkcode Router.get} for the arguments.
	 *
	 * @param args The URL, the handler, an optional list of route middlewares, and optional validation schemas.
	 * @throws {Error} If the route is already registered.
	 */
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

	/**
	 * Registers a `PUT` route. See {@linkcode Router.get} for the arguments.
	 *
	 * @param args The URL, the handler, an optional list of route middlewares, and optional validation schemas.
	 * @throws {Error} If the route is already registered.
	 */
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

	/**
	 * Registers a `PATCH` route. See {@linkcode Router.get} for the arguments.
	 *
	 * @param args The URL, the handler, an optional list of route middlewares, and optional validation schemas.
	 * @throws {Error} If the route is already registered.
	 */
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

	/**
	 * Registers a `DELETE` route. See {@linkcode Router.get} for the arguments.
	 *
	 * @param args The URL, the handler, an optional list of route middlewares, and optional validation schemas.
	 * @throws {Error} If the route is already registered.
	 */
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

	/**
	 * Sets CORS rules for every route of this router. Rules set on a route (`addRoute`) override them, and rules of
	 * a mounted router override those of its parent. Repeated calls are merged.
	 *
	 * @param rules The rules to set; unset keys keep their previous value.
	 */
	public cors(rules: CorsRules): this {
		this.corsRules = mergeCorsRules(this.corsRules, rules);
		return this;
	}

	/**
	 * Mounts a router under a prefix, or registers a middleware, for the routes declared after this call.
	 *
	 * - `use(prefix, router)` mounts every route of `router` under `prefix`.
	 * - `use(router)` mounts them at the root.
	 * - `use(middleware)` runs the middleware before the routes declared after it. Middlewares that add data to
	 * `req.data` are tracked by the types: a route or router needing that data fails to compile if it is registered
	 * before the middleware.
	 *
	 * @throws {TypeError} If the arguments are none of the above.
	 */
	public use<TPrefix extends string, TRouter extends AnyRouter>(
		prefix: TPrefix,
		router: MountableRouter<this, TRouter>,
	): this & RouteMarker<PrefixRoutes<InferRoutes<TRouter>, TPrefix>>;

	/** Mounts a router at the root. */
	public use<TRouter extends AnyRouter>(
		router: MountableRouter<this, TRouter>,
	): this & RouteMarker<PrefixRoutes<InferRoutes<TRouter>, "/">>;

	/** Registers a middleware for the routes declared after this call. */
	public use<TAdds, TNeeds>(
		middleware: ApplicableMiddleware<this, TAdds, TNeeds>,
	): this & DataMarker<TAdds>;
	public use(mpr: AnyListener | string | AnyRouter, router?: AnyRouter): this {
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

		throw new TypeError("use() expects a middleware, a router, or a prefix followed by a router.");
	}

	private mountRouter(router: AnyRouter, prefix = "/"): void {
		for (const routes of router.routes.values()) {
			for (const route of routes) {
				this.pushRoute({
					...route,
					url: normalizePath(prefix, route.url),
					cors: mergeCorsRules(router.corsRules, route.cors),
				});
			}
		}
	}
}

// deno-lint-ignore no-explicit-any
type AnyRouter = Router<any>;

type MountableRouter<TParent, TRouter> = InferData<TParent> extends InferExpected<TRouter> ? TRouter
	: "This router expects context data the parent does not provide. Register the middleware that supplies it before use().";

type ApplicableMiddleware<TParent, TAdds, TNeeds> = InferData<TParent> extends TNeeds ? Middleware<TAdds, TNeeds>
	: MissingContext;
