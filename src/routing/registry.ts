import type { ResolveContext, Schemas } from "../http/context.ts";
import type { HttpResponse, TypedResponse } from "../http/response.ts";
import type { HttpRequest } from "../http/request.ts";
import type { HttpMethods } from "../http/methods.ts";

declare const routesMarker: unique symbol;
export type RouteMarker<TRoutes> = { readonly [routesMarker]: TRoutes };
export type InferRoutes<T> = T extends RouteMarker<infer TRoutes> ? TRoutes : Record<never, never>;

export const dataMarker: unique symbol = Symbol("expressapi.data");
export type DataMarker<TData> = { readonly [dataMarker]: TData };
export type InferData<T> = T extends DataMarker<infer TData> ? TData : Record<never, never>;

export type RouteTypeEntry<TSchemas extends Schemas, TResponse> = {
	schemas: TSchemas;
	response: TResponse;
};

export type RouteEntry<TMethod extends HttpMethods, TUrl extends string, TSchemas extends Schemas, TResponse> = {
	[M in TMethod]: { [U in TUrl]: RouteTypeEntry<TSchemas, TResponse> };
};

export type ListenerReturn = TypedResponse<unknown> | void | Promise<TypedResponse<unknown> | void>;

export type BodyOf<TReturn> = Awaited<TReturn> extends TypedResponse<infer TBody> ? TBody : never;

export type TypedListener<TData, TSchemas extends Schemas, TUrl extends string, TReturn> = (
	req: HttpRequest<ResolveContext<TData, TSchemas, TUrl>>,
	res: HttpResponse,
) => TReturn;

type StripSlashes<S extends string> = S extends `/${infer R}` ? StripSlashes<R>
	: S extends `${infer R}/` ? StripSlashes<R>
	: S;

type JoinPath<A extends string, B extends string> = StripSlashes<A> extends ""
	? StripSlashes<B> extends "" ? "/" : `/${StripSlashes<B>}`
	: StripSlashes<B> extends "" ? `/${StripSlashes<A>}`
	: `/${StripSlashes<A>}/${StripSlashes<B>}`;

export type PrefixRoutes<TRoutes, TPrefix extends string> = {
	[M in keyof TRoutes]: {
		[U in keyof TRoutes[M] as JoinPath<TPrefix, U & string>]: TRoutes[M][U];
	};
};
