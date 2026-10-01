import type { Schema } from "../validation/base.ts";

/** Validation schemas of a route. Each one narrows the matching part of the request. */
export type Schemas = {
	/** Validates `req.query`. */
	query?: Schema<unknown>;
	/** Validates `req.params`. */
	params?: Schema<unknown>;
	/** Validates `req.body`. */
	body?: Schema<unknown>;
};

/** Shape of the typed parts of a request. */
export type RequestContext = {
	/** Data added by middlewares. */
	data: unknown;
	params: unknown;
	query: unknown;
	body: unknown;
};

/** The context of a request without schemas nor middlewares. */
export type DefaultContext = {
	data: Record<never, never>;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: unknown;
};

/** Extracts `:params` from a URL pattern: `"/users/:id"` gives `{ id: string }`. */
export type ExtractParams<S extends string> = S extends `${string}:${infer P}/${infer Rest}`
	? { [K in P]: string } & ExtractParams<Rest>
	: S extends `${string}:${infer P}` ? { [K in P]: string }
	: Record<never, never>;

/** The context of a route: schemas win over the types inferred from the URL. */
export type ResolveContext<TData, TSchemas extends Schemas, TUrl extends string> = {
	data: TData;
	params: TSchemas["params"] extends Schema<infer P> ? P : ExtractParams<TUrl>;
	query: TSchemas["query"] extends Schema<infer Q> ? Q : Record<string, string | undefined>;
	body: TSchemas["body"] extends Schema<infer B> ? B : unknown;
};
