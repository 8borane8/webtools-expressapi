import { HttpServer, type Middleware, middleware, Router, z } from "../src/mod.ts";

type User = { id: string; name: string; role: "admin" | "user" };

// ---- Middlewares: each one declares what it adds to req.data ----

const trace = middleware<{ requestId: string }>((req) => {
	req.data.requestId = crypto.randomUUID();
});

const authMid: Middleware<{ user: User }> = (req, res) => {
	if (!req.headers.get("authorization")) {
		return res.status(401).json({ success: false, error: "401 Unauthorized." });
	}
	req.data.user = { id: "1", name: "Alice", role: "admin" };
};

// The second parameter declares a dependency: `auth` must run first.
const requireAdmin = middleware<{ admin: boolean }, { user: User }>((req) => {
	req.data.admin = req.data.user.role === "admin";
});

// ---- Sub-router: declares the context it assumes the parent provides ----

const usersRouter = new Router<{ user: User }>()
	.get("/users", (_req, res) => res.json([{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }]))
	// No params schema: `req.params.id` is inferred from the URL.
	.get("/users/:id", (req, res) => res.json({ id: req.params.id, name: "Alice" }))
	.post("/users", (req, res) => res.json({ id: crypto.randomUUID(), name: req.body.name }), [], {
		body: z.object({ name: z.string() }),
	})
	.delete("/users/:id", (req, res) => res.json({ deleted: true, id: req.params.id, by: req.data.user.id }));

// ---- Server ----

export const server = new HttpServer()
	.use(trace)
	// Several response shapes: the union is inferred from the `res.json()` calls.
	.get("/health", (req, res) => {
		if (req.data.admin) {
			return res.json({ status: "ok", requestId: req.data.requestId, admin: req.data.admin });
		} else {
			return res.json({ success: false, error: "403 Forbidden." });
		}
	}, [authMid, requireAdmin])
	.use(authMid)
	.get(
		"/search",
		(req, res) => res.json({ term: req.query.q, page: req.query.page ?? "1", results: [] as string[] }),
		[],
		{
			query: z.object({
				q: z.string(),
				page: z.optional(z.string()),
			}),
		},
	)
	.use(requireAdmin)
	.use("/api", usersRouter);

export type AppRouter = typeof server;

// Only starts when this file is run directly: when imported, it must expose
// nothing but the server and its type.
if (import.meta.main) {
	console.log("Server listening on http://localhost:3000");
	server.listen(3000);
}
