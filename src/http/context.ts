import type { Schema } from "../validation/base.ts";

export type Schemas = {
	query?: Schema<unknown>;
	params?: Schema<unknown>;
	body?: Schema<unknown>;
};

export type RequestContext = {
	data: unknown;
	params: unknown;
	query: unknown;
	body: unknown;
};

export type DefaultContext = {
	data: Record<never, never>;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: unknown;
};

export type ExtractParams<S extends string> = S extends `${string}:${infer P}/${infer Rest}`
	? { [K in P]: string } & ExtractParams<Rest>
	: S extends `${string}:${infer P}` ? { [K in P]: string }
	: Record<never, never>;

export type ResolveContext<TData, TSchemas extends Schemas, TUrl extends string> = {
	data: TData;
	params: TSchemas["params"] extends Schema<infer P> ? P : ExtractParams<TUrl>;
	query: TSchemas["query"] extends Schema<infer Q> ? Q : Record<string, string | undefined>;
	body: TSchemas["body"] extends Schema<infer B> ? B : unknown;
};
