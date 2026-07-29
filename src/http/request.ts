import type { DefaultContext, RequestContext } from "./context.ts";
import type { HttpMethods } from "./methods.ts";

export class HttpRequest<TCtx extends RequestContext = DefaultContext> {
	public readonly query: TCtx["query"] = {} as TCtx["query"];
	public readonly params: TCtx["params"] = {} as TCtx["params"];

	public readonly cookies: Record<string, string> = {};

	public data: TCtx["data"] = Object.create(null);

	constructor(
		public readonly url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		public body: TCtx["body"],
		public readonly ip: string | null,
		public readonly raw: Request,
	) {
		if (this.headers.has("cookie")) {
			const cookie = this.headers.get("cookie")!;
			for (const part of cookie.split(";")) {
				const separatorIndex = part.indexOf("=");
				if (separatorIndex === -1) continue;

				const name = part.slice(0, separatorIndex).trim();
				if (!name) continue;

				const value = part.slice(separatorIndex + 1).trim();
				try {
					this.cookies[name] = decodeURIComponent(value);
				} catch {
					this.cookies[name] = value;
				}
			}
		}
	}
}
