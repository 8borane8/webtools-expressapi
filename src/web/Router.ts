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

	public addRoute<TBody = TBodyDefault>(route: Route<TBody, TData>): void {
		const routes = this.routes.get(route.method)!;
		if (routes.some((r) => r.url == route.url)) {
			throw new Error(`The route '${route.url}' is already registered for the '${route.method}' method.`);
		}

		if (route.schema) {
			route.middlewares.unshift(validateBody<TBody, TData>(route.schema));
		}

		routes.push(route);
	}

	public addRoutes<TBody = TBodyDefault>(routes: Route<TBody, TData>[]): void {
		routes.forEach((route) => this.addRoute(route));
	}

	public get(
		url: string,
		requestListener: RequestListener<null, TData>,
		middlewares: RequestListener<null, TData>[] = [],
	): void {
		this.addRoute({ url, method: HttpMethods.GET, middlewares, requestListener });
	}

	public post<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.addRoute({ url, method: HttpMethods.POST, middlewares, requestListener, schema });
	}

	public put<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.addRoute({ url, method: HttpMethods.PUT, middlewares, requestListener, schema });
	}

	public patch<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.addRoute({ url, method: HttpMethods.PATCH, middlewares, requestListener, schema });
	}

	public delete<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.addRoute({ url, method: HttpMethods.DELETE, middlewares, requestListener, schema });
	}

	public use(middleware: RequestListener<TBodyDefault, TData>): void;
	public use(prefix: string, router: Router<TData>): void;
	public use(router: Router<TData>): void;

	public use(
		middlewareOrPrefixOrRouter: RequestListener<TBodyDefault, TData> | string | Router<TData>,
		router?: Router<TData>,
	): void {
		if (typeof middlewareOrPrefixOrRouter === "function") {
			this.middlewares.push(middlewareOrPrefixOrRouter);
			return;
		}

		if (typeof middlewareOrPrefixOrRouter === "string" && router) {
			this.mountRouter(middlewareOrPrefixOrRouter, router);
			return;
		}

		this.mountRouter("", middlewareOrPrefixOrRouter as Router);
	}

	private mountRouter(prefix: string, router: Router<TData>): void {
		const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;

		for (const routes of router.routes.values()) {
			for (const route of routes) {
				this.addRoute({
					...route,
					url: normalizedPrefix + route.url,
					middlewares: [...router.middlewares, ...route.middlewares],
				});
			}
		}
	}
}
