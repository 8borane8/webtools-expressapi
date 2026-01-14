import type { ResolvedSchemas, Route, Schemas } from "./route.ts";
import type { DataDefault } from "../http/request.ts";
import type { RequestListener } from "./listener.ts";
import { StringHelper } from "../helpers/string.ts";
import { HttpMethods } from "../http/methods.ts";

export class Router<TData = DataDefault> {
	protected readonly routes: Map<HttpMethods, Route<TData>[]> = new Map();
	protected readonly middlewares: RequestListener<TData>[] = [];

	constructor(protected readonly prefix: string = "/") {
		for (const method of Object.values(HttpMethods)) {
			this.routes.set(method, []);
		}
	}

	public addRoute<TSchemas extends Schemas>(route: Route<TData, TSchemas>): this {
		const routes = this.routes.get(route.method)!;

		const prefixedUrl = StringHelper.normalizePath(this.prefix, route.url);
		if (routes.some((r) => r.url === prefixedUrl)) {
			throw new Error(
				`The route '${prefixedUrl}' is already registered for the '${route.method}' method.`,
			);
		}

		routes.push({ ...route, url: prefixedUrl } as Route<TData>);
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

	public use(router: Router): this;
	public use(prefix: string, router: Router): this;
	public use(middleware: RequestListener<TData>): this;
	public use(mpr: RequestListener<TData> | string | Router, router?: Router): this {
		if (typeof mpr === "function") {
			this.middlewares.push(mpr);
			return this;
		}

		if (typeof mpr === "string" && router) {
			this.mountRouter(router, mpr);
			return this;
		}

		if (mpr instanceof Router) {
			this.mountRouter(mpr);
			return this;
		}

		return this;
	}

	private mountRouter(router: Router<TData>, prefix = "/"): void {
		for (const routes of router.routes.values()) {
			for (const route of routes) {
				this.addRoute({
					...route,
					url: StringHelper.normalizePath(prefix, route.url),
					middlewares: [...router.middlewares, ...route.middlewares],
				});
			}
		}
	}
}
