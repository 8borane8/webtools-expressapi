import type { DataDefault, HttpRequest, RouteTypes, RouteTypesDefault } from "../http/request.ts";
import type { HttpResponse } from "../http/response.ts";

export type RequestListener<TData = DataDefault, TRouteTypes extends RouteTypes = RouteTypesDefault> = (
	req: HttpRequest<TData, TRouteTypes>,
	res: HttpResponse,
) => Response | void | Promise<Response | void>;
