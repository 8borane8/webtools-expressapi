import type { RequestListener } from "./listener.ts";

type MiddlewareContext<TAdds, TNeeds> = {
	data: TNeeds & Partial<TAdds>;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: unknown;
};

declare const addsMarker: unique symbol;

export type Middleware<TAdds = Record<never, never>, TNeeds = Record<never, never>> =
	& RequestListener<MiddlewareContext<TAdds, TNeeds>>
	& { readonly [addsMarker]?: [TAdds, TNeeds] };

export function middleware<TAdds = Record<never, never>, TNeeds = Record<never, never>>(
	listener: RequestListener<MiddlewareContext<TAdds, TNeeds>>,
): Middleware<TAdds, TNeeds> {
	return listener as Middleware<TAdds, TNeeds>;
}

type InferAdds<M> = M extends Middleware<infer A, infer _N> ? A : Record<never, never>;
type InferNeeds<M> = M extends Middleware<infer _A, infer N> ? N : Record<never, never>;

type CheckMw<TData, M> = TData extends InferNeeds<M> ? M
	: "This middleware depends on context data that is missing. Register the middleware that provides it first.";

export type ValidateChain<TData, TMws extends readonly unknown[]> = TMws extends readonly [] ? TMws
	: TMws extends readonly [infer H, ...infer R]
		? readonly [CheckMw<TData, H>, ...ValidateChain<TData & InferAdds<H>, R>]
	: TMws;

export type ChainAdds<TMws extends readonly unknown[]> = TMws extends readonly [infer H, ...infer R]
	? InferAdds<H> & ChainAdds<R>
	: Record<never, never>;
