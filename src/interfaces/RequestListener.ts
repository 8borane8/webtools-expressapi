import type { HttpResponse } from "../web/HttpResponse.ts";
import type { HttpRequest } from "../web/HttpRequest.ts";
import type { TBodyDefault, TDataDefault } from "./Types.ts";

export type RequestListener<TBody = TBodyDefault, TData = TDataDefault> = (
	req: HttpRequest<TBody, TData>,
	res: HttpResponse,
) => Response | void | Promise<Response | void>;
