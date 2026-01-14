import type { ResolvedSchemas, Route, Schemas } from "./route.ts";
import type { DataDefault } from "../http/request.ts";
import type { RequestListener } from "./listener.ts";
import { HttpMethods } from "../http/methods.ts";

export class Router<TData = DataDefault> {
	protected readonly routes: Map<HttpMethods, Route<TData, Schemas>[]> = new Map();
	protected readonly middlewares: RequestListener[] = [];

	constructor() {
		for (const method of Object.values(HttpMethods)) {
			this.routes.set(method, []);
		}
	}

	public addRoute<TSchemas extends Schemas>(route: Route<TData, TSchemas>): this {
		const routes = this.routes.get(route.method)!;
		if (routes.some((r) => r.url === route.url)) {
			throw new Error(
				`The route '${route.url}' is already registered for the '${route.method}' method.`,
			);
		}

		routes.push(route);
		return this;
	}

	public get<TSchemas extends Schemas>(
		url: string,
		requestListener: RequestListener<TData, ResolvedSchemas<TSchemas>>,
		middlewares: RequestListener<TData, ResolvedSchemas<TSchemas>>[] = [],
		schemas?: TSchemas,
	): this {
		this.addRoute({
			url,
			method: HttpMethods.GET,
			middlewares,
			requestListener,
			schemas,
		});
		return this;
	}

	public post<TSchemas extends Schemas>(
		url: string,
		requestListener: RequestListener<TData, ResolvedSchemas<TSchemas>>,
		middlewares: RequestListener<TData, ResolvedSchemas<TSchemas>>[] = [],
		schemas?: TSchemas,
	): this {
		this.addRoute({
			url,
			method: HttpMethods.POST,
			middlewares,
			requestListener,
			schemas,
		});
		return this;
	}

	public put<TSchemas extends Schemas>(
		url: string,
		requestListener: RequestListener<TData, ResolvedSchemas<TSchemas>>,
		middlewares: RequestListener<TData, ResolvedSchemas<TSchemas>>[] = [],
		schemas?: TSchemas,
	): this {
		this.addRoute({
			url,
			method: HttpMethods.PUT,
			middlewares,
			requestListener,
			schemas,
		});
		return this;
	}

	public patch<TSchemas extends Schemas>(
		url: string,
		requestListener: RequestListener<TData, ResolvedSchemas<TSchemas>>,
		middlewares: RequestListener<TData, ResolvedSchemas<TSchemas>>[] = [],
		schemas?: TSchemas,
	): this {
		this.addRoute({
			url,
			method: HttpMethods.PATCH,
			middlewares,
			requestListener,
			schemas,
		});
		return this;
	}

	public delete<TSchemas extends Schemas>(
		url: string,
		requestListener: RequestListener<TData, ResolvedSchemas<TSchemas>>,
		middlewares: RequestListener<TData, ResolvedSchemas<TSchemas>>[] = [],
		schemas?: TSchemas,
	): this {
		this.addRoute({
			url,
			method: HttpMethods.DELETE,
			middlewares,
			requestListener,
			schemas,
		});
		return this;
	}

	public use(middleware: RequestListener): this;
	public use(prefix: string, router: Router): this;
	public use(router: Router): this;
	public use(middlewareOrPrefixOrRouter: RequestListener | string | Router, router?: Router): this {
		if (typeof middlewareOrPrefixOrRouter === "function") {
			this.middlewares.push(middlewareOrPrefixOrRouter);
			return this;
		}

		if (typeof middlewareOrPrefixOrRouter === "string" && router) {
			this.mountRouter(router, middlewareOrPrefixOrRouter);
			return this;
		}

		if (middlewareOrPrefixOrRouter instanceof Router) {
			this.mountRouter(middlewareOrPrefixOrRouter);
			return this;
		}

		return this;
	}

	private mountRouter(router: Router<TData>, prefix = "/"): void {
		for (const routes of router.routes.values()) {
			for (const route of routes) {
				this.addRoute({
					...route,
					url: Router.joinPaths(prefix, route.url),
					middlewares: [
						...router.middlewares,
						...route.middlewares,
					],
				});
			}
		}
	}

	private static joinPaths(...parts: string[]): string {
		return (
			"/" +
			parts
				.join("/")
				.replace(/\/+/g, "/") // Remove multiple slashes
				.replace(/^\/|\/$/g, "") // Remove leading and trailing slashes
		);
	}
}
