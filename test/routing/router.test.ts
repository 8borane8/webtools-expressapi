import { assertEquals, assertThrows } from "@std/assert";
import { HttpServer, middleware, Router } from "@/mod.ts";
import { call } from "../helpers.ts";

Deno.test("static routes win over dynamic ones whatever the registration order", async () => {
	const server = new HttpServer()
		.get("/users/:id", (req, res) => res.json({ id: req.params.id }))
		.get("/users/me", (_req, res) => res.json({ me: true }));

	assertEquals(await (await call(server, "/users/me")).json(), { me: true });
	assertEquals(await (await call(server, "/users/42")).json(), { id: "42" });
});

Deno.test("route urls are matched literally and params are decoded", async () => {
	const server = new HttpServer()
		.get("/file.json", (_req, res) => res.json({ ok: true }))
		.get("/files/:name", (req, res) => res.json({ name: req.params.name }));

	assertEquals((await call(server, "/file.json")).status, 200);
	assertEquals((await call(server, "/fileXjson")).status, 404);
	assertEquals(await (await call(server, "/files/a%20b%E2%82%AC")).json(), { name: "a b\u20ac" });
	assertEquals(await (await call(server, "/files/%E0%A4%A")).json(), { name: "%E0%A4%A" });
	assertEquals((await call(server, "/files/")).status, 404);
	assertEquals((await call(server, "/files//")).status, 404);
});

Deno.test("trailing slashes are ignored", async () => {
	const server = new HttpServer().get("/a/b", (_req, res) => res.json({ ok: true }));

	assertEquals((await call(server, "/a/b/")).status, 200);
});

Deno.test("routers are mounted under a prefix or at the root", async () => {
	const router = new Router().get("/ping", (_req, res) => res.json({ pong: true }));
	const server = new HttpServer().use("/api/v1/", router).use(router);

	assertEquals((await call(server, "/api/v1/ping")).status, 200);
	assertEquals((await call(server, "/ping")).status, 200);
});

Deno.test("middlewares run in order, only for routes declared after them, and can stop the chain", async () => {
	const calls: string[] = [];
	const first = middleware<{ user: string }>((req) => {
		calls.push("first");
		req.data.user = "alice";
	});
	const guard = middleware((req, res) => {
		calls.push("guard");
		if (!req.headers.has("authorization")) return res.status(401).json({ error: "401" });
	});

	const server = new HttpServer()
		.get("/public", (_req, res) => res.json({ ok: true }))
		.use(first)
		.use(guard)
		.get("/private", (req, res) => res.json({ user: req.data.user }));

	assertEquals((await call(server, "/public")).status, 200);
	assertEquals(calls, []);

	assertEquals((await call(server, "/private")).status, 401);
	assertEquals(calls, ["first", "guard"]);

	calls.length = 0;
	const res = await call(server, "/private", { headers: { authorization: "x" } });
	assertEquals(await res.json(), { user: "alice" });
	assertEquals(calls, ["first", "guard"]);
});

Deno.test("registration errors", () => {
	const server = new HttpServer().get("/a", (_req, res) => res.json({}));

	assertThrows(() => server.get("/a/", (_req, res) => res.json({})), Error, "already registered");
	// deno-lint-ignore no-explicit-any
	assertThrows(() => (server as any).use("/only-a-prefix"), TypeError);
});
