import type { RequestListener } from "./RequestListener.ts";
import type { HttpMethods } from "./HttpMethods.ts";
import type { Schema } from "../validation/Schema.ts";
import type { TBodyDefault, TDataDefault } from "./Types.ts";

export interface Route<TBody = TBodyDefault, TData = TDataDefault> {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener<TBody, TData>[];
	requestListener: RequestListener<TBody, TData>;
	schema?: Schema<TBody>;
}
