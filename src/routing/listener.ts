import type { DefaultContext, RequestContext } from "../http/context.ts";
import type { HttpRequest } from "../http/request.ts";
import type { HttpResponse } from "../http/response.ts";

/**
 * A route handler, a middleware, or a not-found handler. Return a response to answer the request. A middleware that
 * returns nothing hands over to the next step; a route handler must always return a response.
 */
export type RequestListener<TCtx extends RequestContext = DefaultContext> = (
	req: HttpRequest<TCtx>,
	res: HttpResponse,
) => Response | void | Promise<Response | void>;

/** Handles an error thrown while serving a request. Return a response to replace the default 500. */
export type ErrorListener<TCtx extends RequestContext = DefaultContext> = (
	error: unknown,
	req: HttpRequest<TCtx>,
	res: HttpResponse,
) => Response | void | Promise<Response | void>;

// deno-lint-ignore no-explicit-any
export type AnyListener = RequestListener<any>;
