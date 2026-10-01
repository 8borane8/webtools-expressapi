import { assertEquals } from "@std/assert";
import { HttpServer, Router } from "@/mod.ts";
import { call } from "../helpers.ts";

Deno.test("cors: defaults, preflight, 404, and rule precedence", async () => {
	const router = new Router()
		.cors({ allowOrigin: "https://child.test" })
		.get("/child", (_req, res) => res.json({}))
		.get("/post-only", (_req, res) => res.json({}));
	router.addRoute({
		url: "/own",
		method: "GET",
		requestListener: (_req, res) => res.json({}),
		cors: { allowOrigin: "https://route.test" },
	});

	const server = new HttpServer().use("/api", router).get("/plain", (_req, res) => res.json({}));
	// Declared after the router was mounted: must still apply to the routes that do not override it.
	server.cors({ allowCredentials: true });

	const plain = await call(server, "/plain");
	assertEquals(plain.headers.get("access-control-allow-origin"), "*");
	assertEquals(plain.headers.get("access-control-allow-credentials"), "true");
	assertEquals(plain.headers.get("vary"), null);

	const child = await call(server, "/api/child");
	assertEquals(child.headers.get("access-control-allow-origin"), "https://child.test");
	assertEquals(child.headers.get("access-control-allow-credentials"), "true");
	assertEquals(child.headers.get("vary"), "Origin");

	const own = await call(server, "/api/own");
	assertEquals(own.headers.get("access-control-allow-origin"), "https://route.test");

	const preflight = await call(server, "/api/child", {
		method: "OPTIONS",
		headers: { "access-control-request-method": "GET", "access-control-request-headers": "authorization, x-a" },
	});
	assertEquals(preflight.status, 204);
	assertEquals(preflight.headers.get("access-control-allow-origin"), "https://child.test");
	assertEquals(preflight.headers.get("access-control-allow-headers"), "authorization, x-a");
	assertEquals(preflight.headers.get("access-control-max-age"), "86400");

	const notFound = await call(server, "/nope");
	assertEquals(notFound.status, 404);
	assertEquals(notFound.headers.get("access-control-allow-origin"), "*");
});

Deno.test("cors rules can be functions and unset values are not written", async () => {
	const server = new HttpServer()
		.cors({
			allowOrigin: (req) => req.headers.get("origin") === "https://ok.test" ? "https://ok.test" : undefined,
			allowHeaders: undefined,
			maxAge: undefined,
		})
		.get("/", (_req, res) => res.json({}));

	const ok = await call(server, "/", { headers: { origin: "https://ok.test" } });
	assertEquals(ok.headers.get("access-control-allow-origin"), "https://ok.test");
	assertEquals(ok.headers.get("access-control-max-age"), null);

	const other = await call(server, "/", { headers: { origin: "https://evil.test" } });
	assertEquals(other.headers.get("access-control-allow-origin"), null);
});
