import type { DataDefault, RouteTypesDefault } from "../http/request.ts";
import type { HttpMethods } from "../http/methods.ts";
import type { RequestListener } from "./listener.ts";
import type { Schema } from "../validation/base.ts";

export type Schemas = {
	query?: Schema<unknown>;
	params?: Schema<unknown>;
	body?: Schema<unknown>;
};

export type ResolvedSchemas<TSchemas extends Schemas> = TSchemas extends undefined ? RouteTypesDefault : {
	query: TSchemas["query"] extends Schema<infer Q> ? Q : RouteTypesDefault["query"];
	params: TSchemas["params"] extends Schema<infer Q> ? Q : RouteTypesDefault["params"];
	body: TSchemas["body"] extends Schema<infer Q> ? Q : RouteTypesDefault["body"];
};

export interface Route<TData = DataDefault, TSchemas extends Schemas = Schemas> {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener<TData, ResolvedSchemas<TSchemas>>[];
	requestListener: RequestListener<TData, ResolvedSchemas<TSchemas>>;
	schemas?: TSchemas;
}
