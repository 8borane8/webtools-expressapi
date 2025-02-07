import type { HttpMethods } from "./HttpMethods.ts";

export class HttpRequest {
	// deno-lint-ignore no-explicit-any
	public readonly data: any = {};

	public readonly query: Record<string, string> = {};
	public readonly params: Record<string, string> = {};

	public readonly ip: string | null = null;
	public readonly cookies: Record<string, string> = {};

	constructor(
		public url: string,
		public readonly method: HttpMethods,
		public readonly headers: Headers,
		// deno-lint-ignore no-explicit-any
		public readonly body: any,
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
