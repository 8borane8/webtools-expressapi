import type { RequestListener } from "./RequestListener.ts";
import type { HttpMethods } from "./HttpMethods.ts";

export interface Route {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener[];
	requestListener: RequestListener;
}
