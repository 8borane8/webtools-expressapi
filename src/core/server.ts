import type { ErrorListener, RequestListener } from "../routing/listener.ts";
import { type CorsRules, mergeCorsRules, useCors } from "../routing/cors.ts";
import { StringHelper } from "../helpers/string.ts";
import { HttpResponse } from "../http/response.ts";
import { HttpRequest } from "../http/request.ts";
import { HttpMethods } from "../http/methods.ts";
import type { Route } from "../routing/route.ts";
import { Router } from "../routing/router.ts";

export type HttpServerOptions = {
	trustProxy?: boolean;
};

export class HttpServer extends Router {
	protected override corsRules: CorsRules = {
		allowOrigin: "*",
		allowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		allowHeaders: "*",
		maxAge: "86400",
		allowCredentials: false,
	};

	constructor(private readonly options: HttpServerOptions = {}) {
		super();
	}

	private notFoundHandler?: RequestListener;
	private errorHandler?: ErrorListener;

	public notFound(handler: RequestListener): this {
		this.notFoundHandler = handler;
		return this;
	}

	public onError(handler: ErrorListener): this {
		this.errorHandler = handler;
		return this;
	}

	private async handleNotFound(req: HttpRequest, res: HttpResponse): Promise<Response> {
		return (await this.notFoundHandler?.(req, res)) || res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});
	}

	private async handleError(error: unknown, req: HttpRequest, res: HttpResponse): Promise<Response> {
		return (await this.errorHandler?.(error, req, res)) || res.status(500).json({
			success: false,
			error: "500 Internal Server Error.",
		});
	}

	public listen(port: number): void {
		Deno.serve({ port }, this.fetch);
	}

	public fetch = (request: Request, info?: Deno.ServeHandlerInfo<Deno.NetAddr>): Promise<Response> =>
		this.requestListener(request, info);

	private async requestListener(request: Request, info?: Deno.ServeHandlerInfo<Deno.NetAddr>): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method as HttpMethods;
		const body = method === HttpMethods.GET ? null : await this.parseRequestBody(request.clone());

		const normalizedPathname = StringHelper.normalizePath(url.pathname);

		const req = new HttpRequest(
			normalizedPathname,
			method,
			request.headers,
			body,
			this.resolveClientIp(request, info),
			request,
		);

		Object.assign(req.query, Object.fromEntries(url.searchParams.entries()));

		const res = new HttpResponse();

		try {
			return await this.handleRequest(request, req, res, method, normalizedPathname);
		} catch (error) {
			return await this.handleError(error, req, res);
		}
	}

	private async handleRequest(
		request: Request,
		req: HttpRequest,
		res: HttpResponse,
		method: HttpMethods,
		normalizedPathname: string,
	): Promise<Response> {
		if (request.method === "OPTIONS") {
			const resource = this.findPreflightResource(request, normalizedPathname);
			await useCors(req, res, mergeCorsRules(this.corsRules, resource?.cors) as Required<CorsRules>);
			return res.status(204).send(null);
		}

		const route = this.findMatchingRoute(method, normalizedPathname);
		if (!route) return await this.handleNotFound(req, res);

		await useCors(req, res, mergeCorsRules(this.corsRules, route.cors) as Required<CorsRules>);

		Object.assign(req.params, this.extractRouteParams(normalizedPathname, route.url));

		const invalid = this.validate(route, req, res);
		if (invalid) return invalid;

		const globalMiddlewareResponse = await this.executeMiddlewares(this.middlewares, req, res);
		if (globalMiddlewareResponse) return globalMiddlewareResponse;

		const routeMiddlewareResponse = await this.executeMiddlewares(route.middlewares, req, res);
		if (routeMiddlewareResponse) return routeMiddlewareResponse;

		return await route.requestListener(req, res) || await this.handleNotFound(req, res);
	}

	private validate(route: Route, req: HttpRequest, res: HttpResponse): Response | null {
		if (!route.schemas) return null;

		for (const part of ["query", "params", "body"] as const) {
			const schema = route.schemas[part];
			if (!schema) continue;

			const result = schema.safeParse(req[part]);
			if (!result.success) {
				return res.status(400).json({
					success: false,
					error: "400 Bad Request.",
					details: result.error.issues,
				});
			}

			if (part === "body") req.body = result.data;
			else Object.assign(req[part], result.data as object);
		}

		return null;
	}

	private async parseRequestBody(request: Request): Promise<unknown> {
		const contentType = request.headers.get("content-type") || "";

		try {
			if (contentType.startsWith("application/json")) {
				return await request.json();
			}

			if (contentType.startsWith("multipart/form-data")) {
				const formData = await request.formData();
				return Object.fromEntries(formData);
			}

			if (contentType.startsWith("application/x-www-form-urlencoded")) {
				const text = await request.text();
				return Object.fromEntries(new URLSearchParams(text));
			}

			return await request.text();
		} catch {
			return null;
		}
	}

	private resolveClientIp(request: Request, info?: Deno.ServeHandlerInfo<Deno.NetAddr>): string | null {
		if (this.options.trustProxy) {
			const xForwardedFor = request.headers.get("x-forwarded-for");
			const firstHop = xForwardedFor?.split(",")[0].trim();
			if (firstHop) return firstHop;
		}

		return info?.remoteAddr.hostname || null;
	}

	private extractRouteParams(url: string, routeUrl: string): Record<string, string> {
		const urlParts = url.slice(1).split("/");
		const routeParts = routeUrl.slice(1).split("/");
		const params: Record<string, string> = {};

		for (let i = 0; i < routeParts.length; i++) {
			const part = routeParts[i];
			if (part.startsWith(":")) {
				const paramName = part.slice(1);
				const rawValue = urlParts[i] || "";
				try {
					params[paramName] = decodeURIComponent(rawValue);
				} catch {
					params[paramName] = rawValue;
				}
			}
		}

		return params;
	}

	private findMatchingRoute(method: HttpMethods, pathname: string): Route | null {
		const routes = this.routes.get(method);
		if (!routes) return null;

		return routes.find((route) => {
			const pattern = route.url.replace(/:[^\/]+/g, "([^/]+)");
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(pathname);
		}) || null;
	}

	private findPreflightResource(request: Request, pathname: string): Route | null {
		const acrm = request.headers.get("access-control-request-method")?.trim().toUpperCase() ?? "";
		if (acrm && this.routes.has(acrm as HttpMethods)) {
			const match = this.findMatchingRoute(acrm as HttpMethods, pathname);
			if (match) return match;
		}

		return this.findAnyRouteForPath(pathname);
	}

	private findAnyRouteForPath(pathname: string): Route | null {
		for (const m of Object.values(HttpMethods)) {
			const r = this.findMatchingRoute(m, pathname);
			if (r) return r;
		}

		return null;
	}

	private async executeMiddlewares(
		middlewares: RequestListener[],
		req: HttpRequest,
		res: HttpResponse,
	): Promise<Response | null> {
		for (const middleware of middlewares) {
			const response = await middleware(req, res);
			if (response) return response;
		}
		return null;
	}
}
