import type { RequestListener } from "./listener.ts";

type MiddlewareContext<TAdds, TNeeds> = {
	data: TNeeds & Partial<TAdds>;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: unknown;
};

declare const addsMarker: unique symbol;

/**
 * A typed middleware. `TAdds` is the data it adds to `req.data`, `TNeeds` the data it requires from earlier
 * middlewares: registering it too early is a compile error.
 */
export type Middleware<TAdds = Record<never, never>, TNeeds = Record<never, never>> =
	& RequestListener<MiddlewareContext<TAdds, TNeeds>>
	& { readonly [addsMarker]?: [TAdds, TNeeds] };

/**
 * Declares a typed middleware. Return a response to stop the request (e.g. a 401), return nothing to continue.
 *
 * @example
 * ```ts
 * const auth = middleware<{ user: User }>((req, res) => {
 * 	const user = findUser(req.headers.get("authorization"));
 * 	if (!user) return res.status(401).json({ error: "Unauthorized." });
 * 	req.data.user = user;
 * });
 *
 * // The second type parameter lists what must already be in `req.data`.
 * const admin = middleware<{ isAdmin: true }, { user: User }>((req, res) => {
 * 	if (req.data.user.role !== "admin") return res.status(403).json({ error: "Forbidden." });
 * 	req.data.isAdmin = true;
 * });
 * ```
 * @param listener The middleware function.
 */
export function middleware<TAdds = Record<never, never>, TNeeds = Record<never, never>>(
	listener: RequestListener<MiddlewareContext<TAdds, TNeeds>>,
): Middleware<TAdds, TNeeds> {
	return listener as Middleware<TAdds, TNeeds>;
}

export type MissingContext =
	"This middleware depends on context data that is missing. Register the middleware that provides it first.";

type InferAdds<M> = M extends Middleware<infer A, infer _N> ? A : Record<never, never>;
type InferNeeds<M> = M extends Middleware<infer _A, infer N> ? N : Record<never, never>;

type CheckMw<TData, M> = TData extends InferNeeds<M> ? M : MissingContext;

export type ValidateChain<TData, TMws extends readonly unknown[]> = TMws extends readonly [] ? TMws
	: TMws extends readonly [infer H, ...infer R]
		? readonly [CheckMw<TData, H>, ...ValidateChain<TData & InferAdds<H>, R>]
	: TMws;

export type ChainAdds<TMws extends readonly unknown[]> = TMws extends readonly [infer H, ...infer R]
	? InferAdds<H> & ChainAdds<R>
	: Record<never, never>;
