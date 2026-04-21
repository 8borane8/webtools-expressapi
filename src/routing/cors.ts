import type { HttpRequest } from "../http/request.ts";
import type { HttpResponse } from "../http/response.ts";

export type CorsAllow = string | ((req: HttpRequest) => Promise<string | undefined> | string | undefined);

export type CorsRules = {
	allowOrigin?: CorsAllow;
	allowMethods?: CorsAllow;
	allowHeaders?: CorsAllow;
	allowCredentials?: boolean;
	maxAge?: string;
};

export function mergeCorsRules(...rules: (CorsRules | undefined)[]): CorsRules {
	const defined = rules.filter((r): r is CorsRules => r !== undefined);
	if (defined.length === 0) return {};
	return Object.assign({}, ...defined);
}

async function resolveAllow(allow: CorsAllow | undefined, req: HttpRequest): Promise<string | undefined> {
	if (allow === undefined) return undefined;
	return typeof allow === "function" ? await allow(req) : allow;
}

export async function useCors(
	req: HttpRequest,
	res: HttpResponse,
	rules: Required<CorsRules>,
): Promise<void> {
	const allowOrigin = await resolveAllow(rules.allowOrigin, req);
	if (allowOrigin) {
		res.setHeader("Access-Control-Allow-Origin", allowOrigin);

		if (allowOrigin !== "*") {
			const vary = res.getHeader("Vary");
			res.setHeader("Vary", vary ? `${vary}, Origin` : "Origin");
		}
	}

	if (rules.allowCredentials) {
		res.setHeader("Access-Control-Allow-Credentials", "true");
	}

	const allowMethods = await resolveAllow(rules.allowMethods, req);
	if (allowMethods) res.setHeader("Access-Control-Allow-Methods", allowMethods);

	const allowHeaders = await resolveAllow(rules.allowHeaders, req);
	if (allowHeaders) res.setHeader("Access-Control-Allow-Headers", allowHeaders);

	res.setHeader("Access-Control-Max-Age", rules.maxAge);
}
