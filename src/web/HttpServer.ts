import type { RequestListener } from "../interfaces/RequestListener.ts";
import { HttpResponse } from "../interfaces/HttpResponse.ts";
import { HttpMethods } from "../interfaces/HttpMethods.ts";
import { HttpRequest } from "../interfaces/HttpRequest.ts";
import type { Route } from "../interfaces/Route.ts";

export class HttpServer {
	private readonly routes: Map<HttpMethods, Route[]> = new Map(Object.values(HttpMethods).map((v) => [v, []]));
	private readonly middlewares: RequestListener[] = [];

	private endpointNotFoundFunction: RequestListener = HttpServer.endpointNotFoundFunction;

	constructor(port = 5050) {
		Deno.serve({ port }, this.requestListener.bind(this));
	}

	public registerRoute(
		url: string,
		method: HttpMethods,
		middlewares: RequestListener[],
		requestListener: RequestListener,
	): void {
		const routes = this.routes.get(method)!;
		if (routes.some((r) => r.url == url)) {
			throw new Error(`The route '${url}' is already registered for the '${method}' method.`);
		}

		routes.push({ url, method, middlewares, requestListener });
	}

	public get(url: string, requestListener: RequestListener, middlewares: RequestListener[] = []): void {
		this.registerRoute(url, HttpMethods.GET, middlewares, requestListener);
	}

	public post(url: string, requestListener: RequestListener, middlewares: RequestListener[] = []): void {
		this.registerRoute(url, HttpMethods.POST, middlewares, requestListener);
	}

	public put(url: string, requestListener: RequestListener, middlewares: RequestListener[] = []): void {
		this.registerRoute(url, HttpMethods.PUT, middlewares, requestListener);
	}

	public patch(url: string, requestListener: RequestListener, middlewares: RequestListener[] = []): void {
		this.registerRoute(url, HttpMethods.PATCH, middlewares, requestListener);
	}

	public delete(url: string, requestListener: RequestListener, middlewares: RequestListener[] = []): void {
		this.registerRoute(url, HttpMethods.DELETE, middlewares, requestListener);
	}

	public use(middleware: RequestListener): void {
		this.middlewares.push(middleware);
	}

	public setEndpointNotFoundFunction(fnc: RequestListener): void {
		this.endpointNotFoundFunction = fnc;
	}

	private static endpointNotFoundFunction(_req: HttpRequest, res: HttpResponse): Response {
		return res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});
	}

	// deno-lint-ignore no-explicit-any
	private async parseRequestBody(request: Request): Promise<any> {
		const contentType = request.headers.get("content-type") ?? "";

		if (contentType.startsWith("application/json")) {
			return await request.json();
		}

		if (contentType.startsWith("multipart/form-data")) {
			return await request.formData();
		}

		if (contentType.startsWith("application/x-www-form-urlencoded")) {
			return Object.fromEntries(new URLSearchParams(await request.text()));
		}

		return await request.text();
	}

	private async requestListener(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const req = new HttpRequest(
			url.pathname,
			request.method as HttpMethods,
			request.headers,
			await this.parseRequestBody(request.clone()),
			request,
		);

		Object.entries(url.searchParams).forEach(([key, value]) => {
			req.query[key] = value;
		});

		const res = new HttpResponse();

		for (const middleware of this.middlewares) {
			const response = await middleware(req, res);
			if (response instanceof Response) return response;
		}

		if (request.method == "OPTIONS") return res.send(null);

		const route = this.routes.get(req.method)!.find((r) => {
			const regex = new RegExp(`^${r.url.replace(/:[^\/]+/g, "[^/]+")}$`);
			return regex.test(req.url);
		});

		if (route == undefined) {
			return await this.endpointNotFoundFunction(req, res) ||
				HttpServer.endpointNotFoundFunction(req, res);
		}

		const urlParts = req.url.slice(1).split("/");
		const routeParts = route.url.slice(1).split("/");

		for (let i = 0; i < routeParts.length; i++) {
			if (!routeParts[i].startsWith(":")) continue;
			req.params[routeParts[i].slice(1)] = urlParts[i];
		}

		for (const middleware of route.middlewares) {
			const response = await middleware(req, res);
			if (response instanceof Response) return response;
		}

		return await route.requestListener(req, res) ||
			await this.endpointNotFoundFunction(req, res) ||
			HttpServer.endpointNotFoundFunction(req, res);
	}
}
