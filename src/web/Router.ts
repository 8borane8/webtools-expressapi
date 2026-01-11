import type { TBodyDefault, TDataDefault } from "../interfaces/Types.ts";
import type { RequestListener } from "../interfaces/RequestListener.ts";
import { validateBody } from "../validation/validateBody.ts";
import { HttpMethods } from "../interfaces/HttpMethods.ts";
import type { Schema } from "../validation/Schema.ts";
import type { Route } from "../interfaces/Route.ts";

export class Router<TData = TDataDefault> {
	protected readonly routes: Map<HttpMethods, Route<TBodyDefault, TData>[]> = new Map();
	protected readonly middlewares: RequestListener[] = [];

	constructor() {
		for (const method of Object.values(HttpMethods)) {
			this.routes.set(method, []);
		}
	}

	public addRoute<TBody = TBodyDefault>(route: Route<TBody, TData>): this {
		const routes = this.routes.get(route.method)!;
		if (routes.some((r) => r.url == route.url)) {
			throw new Error(`The route '${route.url}' is already registered for the '${route.method}' method.`);
		}

		if (route.schema) {
			route.middlewares.unshift(validateBody<TBody, TData>(route.schema));
		}

		routes.push(route);
		return this;
	}

	public addRoutes<TBody = TBodyDefault>(routes: Route<TBody, TData>[]): this {
		routes.forEach((route) => this.addRoute(route));
		return this;
	}

	public get(
		url: string,
		requestListener: RequestListener<null, TData>,
		middlewares: RequestListener<null, TData>[] = [],
	): this {
		this.addRoute({ url, method: HttpMethods.GET, middlewares, requestListener });
		return this;
	}

	public post<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): this {
		this.addRoute({ url, method: HttpMethods.POST, middlewares, requestListener, schema });
		return this;
	}

	public put<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): this {
		this.addRoute({ url, method: HttpMethods.PUT, middlewares, requestListener, schema });
		return this;
	}

	public patch<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): this {
		this.addRoute({ url, method: HttpMethods.PATCH, middlewares, requestListener, schema });
		return this;
	}

	public delete<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): this {
		this.addRoute({ url, method: HttpMethods.DELETE, middlewares, requestListener, schema });
		return this;
	}

	public use(middleware: RequestListener<TBodyDefault, TData>): this;
	public use(prefix: string, router: Router<TData>): this;
	public use(router: Router<TData>): this;

	public use(
		middlewareOrPrefixOrRouter: RequestListener<TBodyDefault, TData> | string | Router<TData>,
		router?: Router<TData>,
	): this {
		if (typeof middlewareOrPrefixOrRouter === "function") {
			this.middlewares.push(middlewareOrPrefixOrRouter);
			return this;
		}

		if (typeof middlewareOrPrefixOrRouter === "string" && router) {
			this.mountRouter(router, middlewareOrPrefixOrRouter as string);
			return this;
		}

		this.mountRouter(middlewareOrPrefixOrRouter as Router);
		return this;
	}

	private static joinPaths(...parts: string[]): string {
		return (
			"/" +
			parts
				.join("/")
				.replace(/\/+/g, "/")
				.replace(/^\/|\/$/g, "")
		);
	}

	private mountRouter(router: Router<TData>, prefix = "/"): void {
		for (const routes of router.routes.values()) {
			for (const route of routes) {
				this.addRoute({
					...route,
					url: Router.joinPaths(prefix + route.url),
					middlewares: [...router.middlewares, ...route.middlewares],
				});
			}
		}
	}
}
