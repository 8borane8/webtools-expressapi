import { assertEquals } from "@std/assert";
import { HttpServer } from "@/mod.ts";
import { call } from "../helpers.ts";

Deno.test("several cookies can be written", async () => {
	const server = new HttpServer().get(
		"/",
		(_req, res) => res.cookie("a", "1", { httpOnly: true }).cookie("b", "2").json({}),
	);

	const res = await call(server, "/");
	assertEquals(res.headers.getSetCookie(), ["a=1; HttpOnly", "b=2"]);
});

Deno.test("redirect", async () => {
	const server = new HttpServer()
		.get("/old", (_req, res) => res.redirect("/new"))
		.get("/moved", (_req, res) => res.redirect("/new", 301));

	const temporary = await call(server, "/old");
	assertEquals([temporary.status, temporary.headers.get("location")], [307, "/new"]);
	assertEquals((await call(server, "/moved")).status, 301);
});
