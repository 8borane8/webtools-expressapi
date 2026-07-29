import type { DefaultContext, RequestContext } from "../http/context.ts";
import type { HttpRequest } from "../http/request.ts";
import type { HttpResponse } from "../http/response.ts";

export type RequestListener<TCtx extends RequestContext = DefaultContext> = (
	req: HttpRequest<TCtx>,
	res: HttpResponse,
) => Response | void | Promise<Response | void>;

export type ErrorListener<TCtx extends RequestContext = DefaultContext> = (
	error: unknown,
	req: HttpRequest<TCtx>,
	res: HttpResponse,
) => Response | void | Promise<Response | void>;

// deno-lint-ignore no-explicit-any
export type AnyListener = RequestListener<any>;
