import type { TBodyDefault, TDataDefault } from "../interfaces/Types.ts";
import type { RequestListener } from "../interfaces/RequestListener.ts";
import { validateBody } from "../validation/validateBody.ts";
import { HttpMethods } from "../interfaces/HttpMethods.ts";
import type { Schema } from "../validation/Schema.ts";
import type { Route } from "../interfaces/Route.ts";
import { HttpResponse } from "./HttpResponse.ts";
import { HttpRequest } from "./HttpRequest.ts";

export class HttpServer<TData = TDataDefault> {
	private readonly routes: Map<HttpMethods, Route[]> = new Map(Object.values(HttpMethods).map((v) => [v, []]));
	private readonly middlewares: RequestListener[] = [];

	private notFoundEndpoint = (_req: HttpRequest, res: HttpResponse): Response | Promise<Response> =>
		res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});

	constructor(port = 5050) {
		Deno.serve({ port }, this.requestListener.bind(this));
	}

	public registerRoute<TBody = TBodyDefault>(route: Route<TBody, TData>): void {
		const routes = this.routes.get(route.method)!;
		if (routes.some((r) => r.url == route.url)) {
			throw new Error(`The route '${route.url}' is already registered for the '${route.method}' method.`);
		}

		route.middlewares = route.schema
			? [validateBody<TBody, TData>(route.schema), ...route.middlewares as RequestListener<TBody, TData>[]]
			: route.middlewares as RequestListener<TBody, TData>[];

		routes.push(route);
	}

	public registerRoutes<TBody = TBodyDefault>(routes: Route<TBody, TData>[]): void {
		routes.forEach((route) => this.registerRoute(route));
	}

	public get(
		url: string,
		requestListener: RequestListener<null, TData>,
		middlewares: RequestListener<null, TData>[] = [],
	): void {
		this.registerRoute({ url, method: HttpMethods.GET, middlewares, requestListener });
	}

	public post<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.registerRoute({ url, method: HttpMethods.POST, middlewares, requestListener, schema });
	}

	public put<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.registerRoute({ url, method: HttpMethods.PUT, middlewares, requestListener, schema });
	}

	public patch<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.registerRoute({ url, method: HttpMethods.PATCH, middlewares, requestListener, schema });
	}

	public delete<TBody = TBodyDefault>(
		url: string,
		requestListener: RequestListener<TBody, TData>,
		middlewares: RequestListener<TBody, TData>[] = [],
		schema?: Schema<TBody>,
	): void {
		this.registerRoute({ url, method: HttpMethods.DELETE, middlewares, requestListener, schema });
	}

	public use(middleware: RequestListener): void {
		this.middlewares.push(middleware);
	}

	public notFound(fnc: typeof this.notFoundEndpoint): void {
		this.notFoundEndpoint = fnc;
	}

	private async parseRequestBody(request: Request): Promise<TBodyDefault> {
		const contentType = request.headers.get("content-type") || "";

		if (contentType.startsWith("application/json")) {
			try {
				return await request.json();
			} catch {
				return {};
			}
		} else if (contentType.startsWith("multipart/form-data")) {
			try {
				return Object.fromEntries(await request.formData());
			} catch {
				return {};
			}
		} else if (contentType.startsWith("application/x-www-form-urlencoded")) {
			try {
				return Object.fromEntries(new URLSearchParams(await request.text()));
			} catch {
				return {};
			}
		}

		return await request.text();
	}

	private async requestListener(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method as HttpMethods;

		const req = new HttpRequest<TBodyDefault, TData>(
			url.pathname,
			method,
			request.headers,
			method == HttpMethods.GET ? null : await this.parseRequestBody(request.clone()),
			request,
		);

		Object.entries(url.searchParams).forEach(([key, value]) => req.query[key] = value);
		const res = new HttpResponse();

		for (const middleware of this.middlewares) {
			const response = await middleware(req, res);
			if (response) return response;
		}

		if (request.method == "OPTIONS") return res.send(null);

		if (!this.routes.has(req.method)) {
			return await this.notFoundEndpoint(req, res);
		}

		const route = this.routes.get(req.method)?.find((r) => {
			const regex = new RegExp(`^${r.url.replace(/:[^\/]+/g, "[^/]+")}$`);
			return regex.test(req.url);
		});

		if (!route) return await this.notFoundEndpoint(req, res);

		const urlParts = req.url.slice(1).split("/");
		const routeParts = route.url.slice(1).split("/");

		for (let i = 0; i < routeParts.length; i++) {
			if (routeParts[i].startsWith(":")) {
				req.params[routeParts[i].slice(1)] = urlParts[i];
			}
		}

		for (const middleware of route.middlewares) {
			const response = await middleware(req, res);
			if (response) return response;
		}

		return await route.requestListener(req, res) ||
			await this.notFoundEndpoint(req, res);
	}
}
