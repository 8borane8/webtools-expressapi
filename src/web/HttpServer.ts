import type { TBodyDefault, TDataDefault } from "../interfaces/Types.ts";
import type { RequestListener } from "../interfaces/RequestListener.ts";
import { HttpMethods } from "../interfaces/HttpMethods.ts";
import { HttpResponse } from "./HttpResponse.ts";
import { HttpRequest } from "./HttpRequest.ts";
import { Router } from "./Router.ts";

export class HttpServer<TData = TDataDefault> extends Router<TData> {
	private notFoundHandler: RequestListener<TBodyDefault, TData> = (_req, res) =>
		res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});

	constructor(port = 5050) {
		super();
		Deno.serve({ port }, this.requestListener.bind(this));
	}

	public notFound(handler: RequestListener<TBodyDefault, TData>): void {
		this.notFoundHandler = handler;
	}

	private async handleNotFound(req: HttpRequest<TBodyDefault, TData>, res: HttpResponse): Promise<Response> {
		const response = await this.notFoundHandler(req, res);
		return response || res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});
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
			return await this.handleNotFound(req, res);
		}

		const route = this.routes.get(req.method)?.find((r) => {
			const regex = new RegExp(`^${r.url.replace(/:[^\/]+/g, "[^/]+")}$`);
			return regex.test(req.url);
		});

		if (!route) {
			return await this.handleNotFound(req, res);
		}

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

		const routeResponse = await route.requestListener(req, res);
		return routeResponse || await this.handleNotFound(req, res);
	}
}
