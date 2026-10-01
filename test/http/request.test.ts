import { assertEquals } from "@std/assert";
import { HttpServer, z } from "@/mod.ts";
import { call, jsonInit } from "../helpers.ts";

Deno.test("bodies are parsed by content type, invalid JSON is a 400", async () => {
	const server = new HttpServer().post("/", (req, res) => res.json({ body: req.body }));
	const body = async (init: RequestInit) =>
		(await (await call(server, "/", { method: "POST", ...init })).json()).body;

	assertEquals(await body({ headers: { "content-type": "application/json" }, body: '{"a":1}' }), { a: 1 });
	assertEquals(await body({ headers: { "content-type": "application/json" } }), null);
	assertEquals(await body({ headers: { "content-type": "text/plain" }, body: "hi" }), "hi");
	assertEquals(
		await body({ headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=1&b=2" }),
		{ a: "1", b: "2" },
	);

	const form = new FormData();
	form.append("name", "x");
	assertEquals(await body({ body: form }), { name: "x" });

	const invalid = await call(server, "/", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: "{bad",
	});
	assertEquals(invalid.status, 400);
});

Deno.test("validation replaces query, params and body and answers 400 with the issues", async () => {
	const server = new HttpServer()
		.get("/items/:id", (req, res) => res.json({ query: req.query, params: req.params }), [], {
			params: z.object({ id: z.number() }),
			query: z.object({ page: z.optional(z.number()) }),
		})
		.post("/items", (req, res) => res.json(req.body), [], {
			body: z.object({ name: z.string() }),
		});

	const ok = await call(server, "/items/7?page=2&extra=1");
	assertEquals(await ok.json(), { query: { page: 2 }, params: { id: 7 } });

	const bad = await call(server, "/items/x");
	assertEquals(bad.status, 400);
	const body = await bad.json();
	assertEquals(body.error, "400 Bad Request.");
	assertEquals(body.details[0].path, ["id"]);

	assertEquals(await (await call(server, "/items", jsonInit({ name: "a", extra: 1 }))).json(), { name: "a" });
	assertEquals((await call(server, "/items", jsonInit({ name: 1 }))).status, 400);
});

Deno.test("files are validated from multipart bodies", async () => {
	const server = new HttpServer().post("/upload", (req, res) => res.json({ size: req.body.file.size }), [], {
		body: z.object({ file: z.file().maxSize(10) }),
	});

	const upload = (content: string) => {
		const form = new FormData();
		form.append("file", new File([content], "a.txt"));
		return call(server, "/upload", { method: "POST", body: form });
	};

	assertEquals(await (await upload("abc")).json(), { size: 3 });
	assertEquals((await upload("a".repeat(11))).status, 400);
});

Deno.test("query and params have no prototype", async () => {
	const server = new HttpServer().get("/:id", (req, res) =>
		res.json({
			query: typeof req.query.constructor,
			params: typeof req.params.constructor,
		}));

	assertEquals(await (await call(server, "/a")).json(), { query: "undefined", params: "undefined" });
});

Deno.test("cookies are parsed from the Cookie header", async () => {
	const server = new HttpServer().get("/", (req, res) => res.json({ cookies: req.cookies }));

	const res = await call(server, "/", { headers: { cookie: "session=abc; theme=dark" } });
	assertEquals((await res.json()).cookies, { session: "abc", theme: "dark" });
});
