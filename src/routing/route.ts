import type { Schemas } from "../http/context.ts";
import type { HttpMethods } from "../http/methods.ts";
import type { AnyListener } from "./listener.ts";
import type { CorsRules } from "./cors.ts";

export interface Route {
	url: string;
	method: HttpMethods;
	middlewares: AnyListener[];
	requestListener: AnyListener;
	schemas?: Schemas;
	cors?: CorsRules;
}
