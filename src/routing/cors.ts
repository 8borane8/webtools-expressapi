import type { HttpRequest } from "../http/request.ts";
import type { HttpResponse } from "../http/response.ts";

/** A CORS header value: a fixed string, or a function computing it from the request (`undefined` omits the header). */
export type CorsAllow = string | ((req: HttpRequest) => Promise<string | undefined> | string | undefined);

/**
 * CORS rules, set with `.cors()` on a server or router, or per route with `addRoute`.
 *
 * By default a server allows any origin and the usual methods, and echoes the headers requested by the preflight.
 */
export type CorsRules = {
	/** Value of `Access-Control-Allow-Origin`. Anything but `"*"` also adds `Vary: Origin`. */
	allowOrigin?: CorsAllow;
	/** Value of `Access-Control-Allow-Methods`. */
	allowMethods?: CorsAllow;
	/** Value of `Access-Control-Allow-Headers`. */
	allowHeaders?: CorsAllow;
	/** Sends `Access-Control-Allow-Credentials: true`. Browsers refuse it with an origin of `"*"`. */
	allowCredentials?: boolean;
	/** Value of `Access-Control-Max-Age`, in seconds. */
	maxAge?: string;
};

/** Later rules override earlier ones. */
export function mergeCorsRules(...rules: (CorsRules | undefined)[]): CorsRules {
	return Object.assign({}, ...rules);
}

async function resolveAllow(allow: CorsAllow | undefined, req: HttpRequest): Promise<string | undefined> {
	return typeof allow === "function" ? await allow(req) : allow;
}

export async function applyCors(req: HttpRequest, res: HttpResponse, rules: CorsRules): Promise<void> {
	const allowOrigin = await resolveAllow(rules.allowOrigin, req);
	if (allowOrigin) {
		res.setHeader("Access-Control-Allow-Origin", allowOrigin);

		if (allowOrigin !== "*") {
			const vary = res.getHeader("Vary");
			res.setHeader("Vary", vary ? `${vary}, Origin` : "Origin");
		}
	}

	if (rules.allowCredentials) res.setHeader("Access-Control-Allow-Credentials", "true");

	const allowMethods = await resolveAllow(rules.allowMethods, req);
	if (allowMethods) res.setHeader("Access-Control-Allow-Methods", allowMethods);

	const allowHeaders = await resolveAllow(rules.allowHeaders, req);
	if (allowHeaders) res.setHeader("Access-Control-Allow-Headers", allowHeaders);

	if (rules.maxAge) res.setHeader("Access-Control-Max-Age", rules.maxAge);
}
