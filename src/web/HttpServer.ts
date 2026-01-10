import type { RequestListener } from "../interfaces/RequestListener.ts";
import { HttpResponse } from "../interfaces/HttpResponse.ts";
import { HttpMethods } from "../interfaces/HttpMethods.ts";
import { HttpRequest } from "../interfaces/HttpRequest.ts";
import type { Route } from "../interfaces/Route.ts";
import type { Schema } from "../validation/Schema.ts";
import { validateBody } from "../validation/validateBody.ts";

export class HttpServer<TData = unknown> {
	private readonly routes: Map<HttpMethods, Route<TData>[]> = new Map(Object.values(HttpMethods).map((v) => [v, []]));
	private readonly middlewares: RequestListener<unknown, TData>[] = [];

	private endpointNotFoundFunction: RequestListener<unknown, TData> = HttpServer
		.endpointNotFoundFunction as RequestListener<unknown, TData>;

	constructor(port = 5050) {
		Deno.serve({ port }, this.requestListener.bind(this));
	}

	public registerRoute<T = unknown>(
		url: string,
		method: HttpMethods,
		middlewares: RequestListener<unknown, TData>[],
		requestListener: RequestListener<T, TData>,
		schema?: Schema<T>,
	): void {
		const routes = this.routes.get(method)!;
		if (routes.some((r) => r.url == url)) {
			throw new Error(`The route '${url}' is already registered for the '${method}' method.`);
		}

		const finalMiddlewares = schema ? [validateBody<T, TData>(schema), ...middlewares] : middlewares;

		routes.push({
			url,
			method,
			middlewares: finalMiddlewares,
			requestListener: requestListener as RequestListener<unknown, TData>,
			schema,
		});
	}

	public get<T = unknown>(
		url: string,
		requestListener: RequestListener<T, TData>,
		middlewares: RequestListener<unknown, TData>[] = [],
	): void {
		this.registerRoute(url, HttpMethods.GET, middlewares, requestListener);
	}

	public post<T = unknown>(
		url: string,
		requestListener: RequestListener<T, TData>,
		middlewares: RequestListener<unknown, TData>[] = [],
		schema?: Schema<T>,
	): void {
		this.registerRoute(url, HttpMethods.POST, middlewares, requestListener, schema);
	}

	public put<T = unknown>(
		url: string,
		requestListener: RequestListener<T, TData>,
		middlewares: RequestListener<unknown, TData>[] = [],
		schema?: Schema<T>,
	): void {
		this.registerRoute(url, HttpMethods.PUT, middlewares, requestListener, schema);
	}

	public patch<T = unknown>(
		url: string,
		requestListener: RequestListener<T, TData>,
		middlewares: RequestListener<unknown, TData>[] = [],
		schema?: Schema<T>,
	): void {
		this.registerRoute(url, HttpMethods.PATCH, middlewares, requestListener, schema);
	}

	public delete<T = unknown>(
		url: string,
		requestListener: RequestListener<T, TData>,
		middlewares: RequestListener<unknown, TData>[] = [],
		schema?: Schema<T>,
	): void {
		this.registerRoute(url, HttpMethods.DELETE, middlewares, requestListener, schema);
	}

	public use(middleware: RequestListener<unknown, TData>): void {
		this.middlewares.push(middleware);
	}

	public setEndpointNotFoundFunction(fnc: RequestListener<unknown, TData>): void {
		this.endpointNotFoundFunction = fnc;
	}

	private static endpointNotFoundFunction(_req: HttpRequest<unknown, unknown>, res: HttpResponse): Response {
		return res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});
	}

	// deno-lint-ignore no-explicit-any
	private async parseRequestBody(request: Request): Promise<any> {
		const contentType = request.headers.get("content-type") || "";

		if (contentType.startsWith("application/json")) {
			try {
				return await request.json();
			} catch {
				return {};
			}
		}

		if (contentType.startsWith("multipart/form-data")) {
			try {
				return Object.fromEntries(await request.formData());
			} catch {
				return {};
			}
		}

		if (contentType.startsWith("application/x-www-form-urlencoded")) {
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
		const req = new HttpRequest<unknown, TData>(
			url.pathname,
			request.method as HttpMethods,
			request.headers,
			await this.parseRequestBody(request.clone()),
			request,
		);

		Array.from(url.searchParams.entries()).forEach(([key, value]) => req.query[key] = value);
		const res = new HttpResponse();

		if (!this.routes.has(req.method)) {
			return await this.endpointNotFoundFunction(req, res) ||
				HttpServer.endpointNotFoundFunction(req, res);
		}

		const route = this.routes.get(req.method)?.find((r) => {
			const regex = new RegExp(`^${r.url.replace(/:[^\/]+/g, "[^/]+")}$`);
			return regex.test(req.url);
		});

		if (!route) {
			return await this.endpointNotFoundFunction(req, res) ||
				HttpServer.endpointNotFoundFunction(req, res);
		}

		const urlParts = req.url.slice(1).split("/");
		const routeParts = route.url.slice(1).split("/");

		for (let i = 0; i < routeParts.length; i++) {
			if (routeParts[i].startsWith(":")) {
				req.params[routeParts[i].slice(1)] = urlParts[i];
			}
		}

		for (const middleware of this.middlewares) {
			const response = await middleware(req, res);
			if (response) return response;
		}

		for (const middleware of route.middlewares) {
			const response = await middleware(req, res);
			if (response) return response;
		}

		return await route.requestListener(req, res) ||
			await this.endpointNotFoundFunction(req, res) ||
			HttpServer.endpointNotFoundFunction(req, res);
	}
}
