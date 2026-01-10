import type { HttpResponse } from "./HttpResponse.ts";
import type { HttpRequest } from "./HttpRequest.ts";

export type RequestListener<TBody = unknown, TData = unknown> = (
	req: HttpRequest<TBody, TData>,
	res: HttpResponse,
) => Promise<Response | void> | Response | void;
