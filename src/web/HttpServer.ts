import { contentType } from "@std/media-types";

export enum HttpMethods {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}

type RequestListener = (
	req: HttpRequest,
	res: HttpResponse,
) => Promise<Response | void> | Response | void;

interface Route {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener[];
	requestListener: RequestListener;
}

class HttpRequest {
	// deno-lint-ignore no-explicit-any
	public readonly data: any = {};

	public readonly query: Map<string, string> = new Map();
	public readonly params: Map<string, string> = new Map();

	constructor(
		public url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		public readonly body: string | object | null,
	) {}
}

class HttpResponse {
	private readonly headers: Map<string, string> = new Map();
	private code: number = 200;

	public setHeader(name: string, value: string): void {
		this.headers.set(name, value);
	}

	public status(code: number): HttpResponse {
		this.code = code;
		return this;
	}

	public send(text: string): Response {
		return new Response(text, { status: this.code, headers: this.headers });
	}

	public json(object: object): Response {
		return new Response(JSON.stringify(object), {
			status: this.code,
			headers: {
				"Content-Type": "application/json",
				...this.headers,
			},
		});
	}

	public redirect(url: string): Response {
		this.code = 302;
		this.setHeader("Location", url);
		return new Response(null, { status: this.code, headers: this.headers });
	}

	public sendFile(path: string): Response {
		this.setHeader(
			"Content-Type",
			contentType(path) || "application/octet-stream",
		);
		this.setHeader("Content-Length", Deno.statSync(path).size.toString());

		const file = Deno.openSync(path, { read: true });
		return new Response(file.readable, {
			status: this.code,
			headers: this.headers,
		});
	}
}

export default class HttpServer {
	private readonly routes: Map<HttpMethods, Route[]> = new Map(
		Object.values(HttpMethods).map((value) => [value, []]),
	);

	private readonly middlewares: RequestListener[] = [];

	private endpointNotFoundFunction: RequestListener =
		HttpServer.defaultEndpointNotFoundFunction;

	constructor(port = 5050) {
		Deno.serve({ port }, this.requestListener.bind(this));
	}

	/**
	 * Register a new route with the specified URL, HTTP method, middlewares and request listener.
	 * @method registerRoute
	 * @param {string} url - The URL of the route.
	 * @param {HttpMethods} method - The HTTP method of the route.
	 * @param {RequestListener[]} middlewares - An array of middleware functions to be executed before the request listener.
	 * @param {RequestListener} requestListener - The function to be executed when the route is matched.
	 * @throws {Error} If the route is already registered for the specified HTTP method.
	 */
	public registerRoute(
		url: string,
		method: HttpMethods,
		middlewares: RequestListener[],
		requestListener: RequestListener,
	): void {
		const methodRoutes = this.routes.get(method);
		if (methodRoutes && methodRoutes.some((r) => r.url == url)) {
			throw new Error(
				`The route '${url}' is already registered for the '${method}' method.`,
			);
		}
		methodRoutes?.push({ url, method, middlewares, requestListener });
	}

	/**
	 * Register a new GET route with the specified URL, request listener and middlewares.
	 * @method get
	 * @param {string} url - The URL of the route.
	 * @param {RequestListener} requestListener - The function to be executed when the route is matched.
	 * @param {RequestListener[]} [middlewares=[]] - An array of middleware functions to be executed before the request listener.
	 */
	public get(
		url: string,
		requestListener: RequestListener,
		middlewares: RequestListener[] = [],
	): void {
		this.registerRoute(url, HttpMethods.GET, middlewares, requestListener);
	}

	/**
	 * Register a new POST route with the specified URL, request listener and middlewares.
	 * @method post
	 * @param {string} url - The URL of the route.
	 * @param {RequestListener} requestListener - The function to be executed when the route is matched.
	 * @param {RequestListener[]} [middlewares=[]] - An array of middleware functions to be executed before the request listener.
	 */
	public post(
		url: string,
		requestListener: RequestListener,
		middlewares: RequestListener[] = [],
	): void {
		this.registerRoute(url, HttpMethods.POST, middlewares, requestListener);
	}

	/**
	 * Register a new PUT route with the specified URL, request listener and middlewares.
	 * @method put
	 * @param {string} url - The URL of the route.
	 * @param {RequestListener} requestListener - The function to be executed when the route is matched.
	 * @param {RequestListener[]} [middlewares=[]] - An array of middleware functions to be executed before the request listener.
	 */
	public put(
		url: string,
		requestListener: RequestListener,
		middlewares: RequestListener[] = [],
	): void {
		this.registerRoute(url, HttpMethods.PUT, middlewares, requestListener);
	}

	/**
	 * Register a new PATCH route with the specified URL, request listener and middlewares.
	 * @method patch
	 * @param {string} url - The URL of the route.
	 * @param {RequestListener} requestListener - The function to be executed when the route is matched.
	 * @param {RequestListener[]} [middlewares=[]] - An array of middleware functions to be executed before the request listener.
	 */
	public patch(
		url: string,
		requestListener: RequestListener,
		middlewares: RequestListener[] = [],
	): void {
		this.registerRoute(
			url,
			HttpMethods.PATCH,
			middlewares,
			requestListener,
		);
	}

	/**
	 * Register a new DELETE route with the specified URL, request listener and middlewares.
	 * @method delete
	 * @param {string} url - The URL of the route.
	 * @param {RequestListener} requestListener - The function to be executed when the route is matched.
	 * @param {RequestListener[]} [middlewares=[]] - An array of middleware functions to be executed before the request listener.
	 */
	public delete(
		url: string,
		requestListener: RequestListener,
		middlewares: RequestListener[] = [],
	): void {
		this.registerRoute(
			url,
			HttpMethods.DELETE,
			middlewares,
			requestListener,
		);
	}

	/**
	 * Add a middleware function to the application.
	 * @method use
	 * @param {RequestListener} middleware - The middleware function to be added.
	 */
	public use(middleware: RequestListener): void {
		this.middlewares.push(middleware);
	}

	/**
	 * Set the function to be called when an endpoint is not found.
	 * @method setEndpointNotFoundFunction
	 * @param {RequestListener} endpointNotFoundFunction - The function to be called when an endpoint is not found.
	 */
	public setEndpointNotFoundFunction(
		endpointNotFoundFunction: RequestListener,
	): void {
		this.endpointNotFoundFunction = endpointNotFoundFunction;
	}

	private static defaultEndpointNotFoundFunction(
		_req: HttpRequest,
		res: HttpResponse,
	): Response {
		return res.status(404).json({
			success: false,
			error: "404 Endpoint not found.",
		});
	}

	private async requestListener(request: Request): Promise<Response> {
		if (request.method == "OPTIONS") {
			return new Response(null, { status: 200 });
		}

		const url = new URL(request.url);
		const req = new HttpRequest(
			url.pathname,
			request.method as HttpMethods,
			request.headers,
			request.headers.get("content-type")?.startsWith("application/json")
				? await request.json()
				: await request.text(),
		);

		url.searchParams.forEach((value, key) => req.query.set(key, value));

		const res = new HttpResponse();

		for (const middleware of this.middlewares) {
			const response = await middleware(req, res);
			if (response instanceof Response) {
				return response;
			}
		}

		const route = this.routes.get(req.method)?.find((r) =>
			new RegExp(`^${r.url.replace(/:[a-zA-Z0-9_]+/g, "[^/]+")}$`).test(
				req.url,
			)
		);

		if (!route) {
			return await this.endpointNotFoundFunction(req, res) ||
				HttpServer.defaultEndpointNotFoundFunction(req, res);
		}

		const urlParts = req.url.split("/");
		route.url.split("/").forEach((part, index) => {
			if (part.startsWith(":")) {
				req.params.set(part.slice(1), urlParts[index]);
			}
		});

		return await route.requestListener(req, res) ||
			await this.endpointNotFoundFunction(req, res) ||
			HttpServer.defaultEndpointNotFoundFunction(req, res);
	}
}
