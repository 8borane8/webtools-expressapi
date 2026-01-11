import type { HttpMethods } from "../interfaces/HttpMethods.ts";
import type { TBodyDefault, TDataDefault } from "../interfaces/Types.ts";

export class HttpRequest<TBody = TBodyDefault, TData = TDataDefault> {
	public data: TData = {} as TData;

	public readonly query: Record<string, string> = {};
	public readonly params: Record<string, string> = {};

	public readonly ip: string | null = null;
	public readonly cookies: Record<string, string> = {};

	constructor(
		public readonly url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		public body: TBody,
		public readonly raw: Request,
	) {
		if (this.headers.has("x-forwarded-for")) {
			const xForwardedFor = this.headers.get("x-forwarded-for")!;
			this.ip = xForwardedFor.split(",")[0].trim();
		}

		if (this.headers.has("cookie")) {
			const cookie = this.headers.get("cookie")!;
			cookie.split(";").forEach((cookie) => {
				const parts = cookie.trim().split("=");
				if (parts.length != 2) return;

				this.cookies[parts[0]] = parts[1];
			});
		}
	}
}
