import { applyCors, type CorsRules, mergeCorsRules } from "../routing/cors.ts";
import type { ErrorListener, RequestListener } from "../routing/listener.ts";
import { findRoute, normalizePath } from "../routing/match.ts";
import { HttpResponse } from "../http/response.ts";
import { HttpRequest } from "../http/request.ts";
import { HttpMethods } from "../http/methods.ts";
import type { Route } from "../routing/route.ts";
import { Router } from "../routing/router.ts";
import { parseBody } from "../http/body.ts";

/** Options of {@linkcode HttpServer}. */
export type HttpServerOptions = {
	/** Read the client IP from `X-Forwarded-For`. Only enable it behind exactly one trusted reverse proxy. */
	trustProxy?: boolean;
};

/**
 * A type-safe HTTP server. Register routes with `get`, `post`, `put`, `patch`, `delete` or `addRoute`, compose
 * middlewares and routers with `use`, then call {@linkcode HttpServer.listen} or hand {@linkcode HttpServer.fetch}
 * to any `fetch`-compatible runtime. Export `typeof server` to get a fully typed `HttpClient`.
 *
 * @example
 * ```ts
 * const server = new HttpServer()
 * 	.get("/users/:id", (req, res) => res.json({ id: req.params.id }));
 *
 * server.listen(5050);
 * ```
 */
export class HttpServer extends Router {
	/** Default CORS rules of the server: any origin, usual methods, requested headers echoed back. */
	protected override corsRules: CorsRules = {
		allowOrigin: "*",
		allowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		// A "*" wildcard does not cover `Authorization`, so the requested headers are echoed back.
		allowHeaders: (req) => req.headers.get("access-control-request-headers") ?? undefined,
		maxAge: "86400",
	};

	private notFoundHandler?: RequestListener;
	private errorHandler?: ErrorListener;

	/**
	 * Creates a server with no routes.
	 *
	 * @param options Server options, see {@linkcode HttpServerOptions}.
	 */
	constructor(private readonly options: HttpServerOptions = {}) {
		super();
	}

	/**
	 * Sets the handler used when no route matches. Without it, a JSON 404 is sent.
	 *
	 * @param handler Return a response to override the default 404.
	 */
	public notFound(handler: RequestListener): this {
		this.notFoundHandler = handler;
		return this;
	}

	/**
	 * Sets the handler used when a route, a middleware or a validation step throws. Without it, the error is logged
	 * and a JSON 500 is sent.
	 *
	 * @param handler Return a response to override the default 500.
	 */
	public onError(handler: ErrorListener): this {
		this.errorHandler = handler;
		return this;
	}

	/**
	 * Starts the server with `Deno.serve`.
	 *
	 * @param port The port to listen on.
	 * @param hostname The interface to bind, all of them by default.
	 * @returns The running server, call `shutdown()` on it to stop.
	 */
	public listen(port: number, hostname?: string): Deno.HttpServer<Deno.NetAddr> {
		return Deno.serve({ port, hostname }, this.fetch);
	}

	/**
	 * The request handler. Pass it to `Deno.serve`, or call it directly with a `Request` to test the server without
	 * opening a port.
	 *
	 * @param request The incoming request.
	 * @param info Connection info provided by `Deno.serve`, used to resolve the client IP.
	 */
	public fetch = async (request: Request, info?: Deno.ServeHandlerInfo<Deno.NetAddr>): Promise<Response> => {
		const url = new URL(request.url);
		const req = new HttpRequest(
			normalizePath(url.pathname),
			request.method,
			request.headers,
			null,
			this.resolveClientIp(request, info),
			request,
		);
		Object.assign(req.query, Object.fromEntries(url.searchParams));

		const res = new HttpResponse();

		try {
			const response = await this.handleRequest(req, res);
			return request.method === "HEAD" ? new Response(null, response) : response;
		} catch (error) {
			return await this.handleError(error, req, res);
		}
	};

	private async handleRequest(req: HttpRequest, res: HttpResponse): Promise<Response> {
		if (req.method === "OPTIONS") {
			await applyCors(req, res, mergeCorsRules(this.corsRules, this.findPreflightRoute(req)?.cors));
			return res.status(204).send(null);
		}

		const match = findRoute(this.routes.get(req.method === "HEAD" ? HttpMethods.GET : req.method), req.path);
		if (!match) {
			await applyCors(req, res, this.corsRules);
			return await this.handleNotFound(req, res);
		}

		const { route, params } = match;
		await applyCors(req, res, mergeCorsRules(this.corsRules, route.cors));
		req.params = params;

		if (req.method !== HttpMethods.GET && req.method !== "HEAD") {
			try {
				req.body = await parseBody(req.raw);
			} catch {
				return res.status(400).json({
					success: false,
					error: "400 Bad Request.",
					details: "The request body could not be parsed.",
				});
			}
		}

		const invalid = this.validate(route, req, res);
		if (invalid) return invalid;

		for (const middleware of route.middlewares) {
			const response = await middleware(req, res);
			if (response) return response;
		}

		const response = await route.requestListener(req, res);
		if (!response) throw new Error(`The handler of ${req.method} ${req.path} returned no response.`);
		return response;
	}

	private async handleNotFound(req: HttpRequest, res: HttpResponse): Promise<Response> {
		return (await this.notFoundHandler?.(req, res)) || res.status(404).json({
			success: false,
			error: "404 Not Found.",
		});
	}

	private async handleError(error: unknown, req: HttpRequest, res: HttpResponse): Promise<Response> {
		const handled = await this.errorHandler?.(error, req, res);
		if (handled) return handled;

		console.error(`[${req.method} ${req.path}]`, error);
		return res.status(500).json({
			success: false,
			error: "500 Internal Server Error.",
		});
	}

	private validate(route: Route, req: HttpRequest, res: HttpResponse): Response | null {
		for (const part of ["query", "params", "body"] as const) {
			const result = route.schemas?.[part]?.safeParse(req[part]);
			if (!result) continue;

			if (!result.success) {
				return res.status(400).json({
					success: false,
					error: "400 Bad Request.",
					details: result.error.issues,
				});
			}

			req[part] = result.data as never;
		}

		return null;
	}

	private resolveClientIp(request: Request, info?: Deno.ServeHandlerInfo<Deno.NetAddr>): string | null {
		if (this.options.trustProxy) {
			// The first entries are client-controlled; the last one is added by our own proxy.
			const lastHop = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
			if (lastHop) return lastHop;
		}

		return info?.remoteAddr.hostname || null;
	}

	private findPreflightRoute(req: HttpRequest): Route | null {
		const requestedMethod = req.headers.get("access-control-request-method")?.trim().toUpperCase();
		const methods = requestedMethod ? [requestedMethod, ...Object.values(HttpMethods)] : Object.values(HttpMethods);

		for (const method of methods) {
			const match = findRoute(this.routes.get(method), req.path);
			if (match) return match.route;
		}

		return null;
	}
}
