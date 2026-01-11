import type { RequestListener } from "./RequestListener.ts";
import type { HttpMethods } from "./HttpMethods.ts";
import type { Schema } from "../validation/Schema.ts";

export interface Route<TData = unknown> {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener<unknown, TData>[];
	requestListener: RequestListener<unknown, TData>;
	schema?: Schema<unknown>;
}
