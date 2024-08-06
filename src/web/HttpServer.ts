import { contentType } from "@std/media-types";

/**
 * A simple HTTP server implementation.
 * @module HttpServer
 */

/**
 * @enum {string} HttpMethods - Enum representing the HTTP methods supported by the server.
 * @property {string} GET - The HTTP GET method.
 * @property {string} POST - The HTTP POST method.
 * @property {string} PUT - The HTTP PUT method.
 * @property {string} PATCH - The HTTP PATCH method.
 * @property {string} DELETE - The HTTP DELETE method.
 */
export enum HttpMethods {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}

/**
 * Le type RequestListener représente la signature d'une fonction qui gère une requête HTTP entrante.
 * @param {HttpRequest} req - L'objet HttpRequest représentant la requête entrante.
 * @param {HttpResponse} res - L'objet HttpResponse permettant de définir la réponse HTTP à envoyer.
 * @returns {Promise<Response | void> | Response | void} Une promesse résolue avec la réponse HTTP à envoyer, ou rien si la réponse a déjà été envoyée.
 */
export type RequestListener = (
	req: HttpRequest,
	res: HttpResponse,
) => Promise<Response | void> | Response | void;

/**
 * Interface pour définir une route.
 * @interface Route
 * @property {string} url - L'URL de la route.
 * @property {HttpMethods} method - La méthode HTTP de la route.
 * @property {RequestListener[]} middlewares - Les middlewares à appliquer à la route.
 * @property {RequestListener} requestListener - Le listener à appeler lorsque la route est appelée.
 */
export interface Route {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener[];
	requestListener: RequestListener;
}

/**
 * @typedef {Object} HttpRequest - Object representing an incoming HTTP request.
 * @property {string} url - The request URL.
 * @property {HttpMethods} method - The HTTP method of the request.
 * @property {Headers} headers - The headers of the request.
 * @property {string|object|null} body - The body of the request.
 * @property {Map<string, string>} query - The query parameters of the request.
 * @property {Map<string, string>} params - The route parameters of the request.
 */
export class HttpRequest {
	// deno-lint-ignore no-explicit-any
	public readonly data: any = {};

	public readonly query: Map<string, string> = new Map();
	public readonly params: Map<string, string> = new Map();

	constructor(
		public url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		// deno-lint-ignore no-explicit-any
		public readonly body: any,
	) {}
}

/**
 * A class for building HTTP responses.
 * @class HttpResponse
 */
export class HttpResponse {
	private readonly headers: Map<string, string> = new Map();
	private code: number = 200;

	/**
	 * Set a response header.
	 * @method setHeader
	 * @param {string} name - The header name.
	 * @param {string} value - The header value.
	 */
	public setHeader(name: string, value: string): void {
		this.headers.set(name, value);
	}

	/**
	 * Set the response status code.
	 * @method status
	 * @param {number} code - The status code.
	 * @returns {HttpResponse} The current instance of HttpResponse.
	 */
	public status(code: number): HttpResponse {
		this.code = code;
		return this;
	}

	/**
	 * Send a text response.
	 * @method send
	 * @param {string} text - The text to send.
	 * @returns {Response} The response object.
	 */
	public send(text: string | null): Response {
		return new Response(text, { status: this.code, headers: this.headers });
	}

	/**
	 * Send a JSON response.
	 * @method json
	 * @param {object} object - The object to send as JSON.
	 * @returns {Response} The response object.
	 */
	public json(object: object): Response {
		this.setHeader("Content-Type", "application/json");

		return new Response(JSON.stringify(object), {
			status: this.code,
			headers: this.headers,
		});
	}

	/**
	 * Send a redirect response.
	 * @method redirect
	 * @param {string} url - The URL to redirect to.
	 * @returns {Response} The response object.
	 */
	public redirect(url: string): Response {
		this.code = 302;
		this.setHeader("Location", url);
		return new Response(null, { status: this.code, headers: this.headers });
	}

	/**
	 * Send a file as a response.
	 * @method sendFile
	 * @param {string} path - The path to the file to send.
	 * @returns {Response} The response object.
	 */
	public sendFile(path: string): Response {
		this.setHeader(
			"Content-Type",
			contentType(`.${path.split(".").at(-1)}`) ||
				"application/octet-stream",
		);
		this.setHeader("Content-Length", Deno.statSync(path).size.toString());

		const file = Deno.openSync(path, { read: true });
		return new Response(file.readable, {
			status: this.code,
			headers: this.headers,
		});
	}
}

/**
 * The HttpServer class.
 * @class HttpServer
 */
export class HttpServer {
	private readonly routes: Map<HttpMethods, Route[]> = new Map(
		Object.values(HttpMethods).map((value) => [value, []]),
	);

	private readonly middlewares: RequestListener[] = [];

	private endpointNotFoundFunction: RequestListener =
		HttpServer.EndpointNotFoundFunction;

	/**
	 * Create a new instance of HttpServer.
	 * @constructor
	 * @param {number} [port=5050] - The port number to listen on.
	 */
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

	private static EndpointNotFoundFunction(
		_req: HttpRequest,
		res: HttpResponse,
	): Response {
		return res.status(404).json({
			success: false,
			error: "404 Endpoint not found.",
		});
	}

	private async requestListener(request: Request): Promise<Response> {
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

		if (request.method == "OPTIONS") {
			return res.send("");
		}

		const route = this.routes.get(req.method)?.find((r) =>
			new RegExp(`^${r.url.replace(/:[a-zA-Z0-9_]+/g, "[^/]+")}$`).test(
				req.url,
			)
		);

		if (!route) {
			return await this.endpointNotFoundFunction(req, res) ||
				HttpServer.EndpointNotFoundFunction(req, res);
		}

		const urlParts = req.url.split("/");
		route.url.split("/").forEach((part, index) => {
			if (part.startsWith(":")) {
				req.params.set(part.slice(1), urlParts[index]);
			}
		});

		for (const middleware of route.middlewares) {
			const response = await middleware(req, res);
			if (response instanceof Response) {
				return response;
			}
		}

		return await route.requestListener(req, res) ||
			await this.endpointNotFoundFunction(req, res) ||
			HttpServer.EndpointNotFoundFunction(req, res);
	}
}
