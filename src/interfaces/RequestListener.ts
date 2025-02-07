import type { HttpResponse } from "./HttpResponse.ts";
import type { HttpRequest } from "./HttpRequest.ts";

export type RequestListener = (req: HttpRequest, res: HttpResponse) => Promise<Response | void> | Response | void;
