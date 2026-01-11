import { contentType } from "@std/media-types";

export class HttpResponse {
	private code: number = 200;
	private readonly headers: Map<string, string> = new Map();

	public setHeader(name: string, value: string): HttpResponse {
		this.headers.set(name, value);
		return this;
	}

	public status(code: number): HttpResponse {
		this.code = code;
		return this;
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

	public sendFile(path: string): Response {
		const file = Deno.openSync(path, { read: true });
		const size = Deno.statSync(path).size;
		const type = path.split(".").at(-1)!;

		return this.type(type).size(size).send(file.readable);
	}
}
