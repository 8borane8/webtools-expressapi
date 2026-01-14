import { type DataDefault, HttpRequest } from "../http/request.ts";
import type { RequestListener } from "../routing/listener.ts";
import { StringHelper } from "../helpers/string.ts";
import { HttpResponse } from "../http/response.ts";
import { HttpMethods } from "../http/methods.ts";
import type { Route } from "../routing/route.ts";
import { Router } from "../routing/router.ts";

export class HttpServer<TData = DataDefault> extends Router<TData> {
	private notFoundHandler: RequestListener = (_req, res) =>
		res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});

	constructor(private readonly port = 5050) {
		super();
	}

	public notFound(handler: RequestListener): this {
		this.notFoundHandler = handler;
		return this;
	}

	private async handleNotFound(req: HttpRequest, res: HttpResponse): Promise<Response> {
		const response = await this.notFoundHandler(req, res);
		return response || res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});
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

	private extractQueryParams(searchParams: URLSearchParams): Record<string, string> {
		return Object.fromEntries(searchParams.entries());
	}

	private extractRouteParams(url: string, routeUrl: string): Record<string, string> {
		const urlParts = url.slice(1).split("/");
		const routeParts = routeUrl.slice(1).split("/");
		const params: Record<string, string> = {};

		for (let i = 0; i < routeParts.length; i++) {
			const part = routeParts[i];
			if (part.startsWith(":")) {
				const paramName = part.slice(1);
				params[paramName] = urlParts[i] || "";
			}
		}

		return params;
	}

	private findMatchingRoute(method: HttpMethods, pathname: string): Route<TData> | null {
		const routes = this.routes.get(method);
		if (!routes) return null;

		return routes.find((route) => {
			// Transform the route url to a regex to match the pathname
			const pattern = route.url.replace(/:[^\/]+/g, "([^/]+)");
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(pathname);
		}) || null;
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

	private async requestListener(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method as HttpMethods;
		const body = method === HttpMethods.GET ? null : await this.parseRequestBody(request.clone());

		// Normalize pathname by removing trailing slash (except for root)
		const normalizedPathname = StringHelper.normalizePath(url.pathname);

		const req = new HttpRequest(
			normalizedPathname,
			method,
			request.headers,
			body,
			request,
		);

		const queryParams = this.extractQueryParams(url.searchParams);
		Object.assign(req.query, queryParams);

		const res = new HttpResponse();

		const globalMiddlewareResponse = await this.executeMiddlewares(this.middlewares, req, res);
		if (globalMiddlewareResponse) return globalMiddlewareResponse;

		if (request.method === "OPTIONS") {
			return res.status(200).send(null);
		}

		const route = this.findMatchingRoute(method, normalizedPathname);
		if (!route) return await this.handleNotFound(req, res);

		const routeParams = this.extractRouteParams(normalizedPathname, route.url);
		Object.assign(req.params, routeParams);

		if (route.schemas) {
			if (route.schemas.query) {
				const queryResult = route.schemas.query.safeParse(req.query);
				if (!queryResult.success) {
					return res.status(400).json({
						success: false,
						error: "400 Bad Request.",
						details: queryResult.error.issues,
					});
				}
				Object.assign(req.query, queryResult.data);
			}

			if (route.schemas.params) {
				const paramsResult = route.schemas.params.safeParse(req.params);
				if (!paramsResult.success) {
					return res.status(400).json({
						success: false,
						error: "Invalid route parameters",
						details: paramsResult.error.issues,
					});
				}
				Object.assign(req.params, paramsResult.data);
			}

			if (route.schemas.body) {
				const bodyResult = route.schemas.body.safeParse(req.body);
				if (!bodyResult.success) {
					return res.status(400).json({
						success: false,
						error: "Invalid request body",
						details: bodyResult.error.issues,
					});
				}
				req.body = bodyResult.data;
			}
		}

		if (route.middlewares) {
			const routeMiddlewareResponse = await this.executeMiddlewares(route.middlewares, req, res);
			if (routeMiddlewareResponse) return routeMiddlewareResponse;
		}

		return await route.requestListener(req, res) || await this.handleNotFound(req, res);
	}

	public listen(): void {
		Deno.serve({ port: this.port }, this.requestListener.bind(this));
	}
}
