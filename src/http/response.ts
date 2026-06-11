import { contentType } from "@std/media-types";

export class HttpResponse {
	private readonly headers: Map<string, string> = new Map();
	private code: number = 200;

	public status(code: number): HttpResponse {
		this.code = code;
		return this;
	}

	public setHeader(name: string, value: string): HttpResponse {
		this.headers.set(name, value);
		return this;
	}

	public getHeader(name: string): string | null {
		return this.headers.get(name) || null;
	}

	public type(type: string): HttpResponse {
		this.setHeader("Content-Type", contentType(`.${type}`) || "application/octet-stream");
		return this;
	}

	public size(size: number): HttpResponse {
		this.setHeader("Content-Length", size.toString());
		return this;
	}

	public send(body: BodyInit | null): Response {
		return new Response(body, { status: this.code, headers: this.headers });
	}

	public json(body: unknown): Response {
		return this.type("json").send(JSON.stringify(body));
	}

	public redirect(url: string, code: number = 307): Response {
		return this.setHeader("Location", url).status(code).send(null);
	}

	public async sendFile(path: string): Promise<Response> {
		const file = await Deno.open(path, { read: true });

		const stat = await file.stat();
		const type = path.split(".").at(-1)!;
		return this.type(type).size(stat.size).send(file.readable);
	}
}
