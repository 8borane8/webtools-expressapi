<h1 align="center">ExpressAPI</h1>

<p align="center">
    <em>
        A minimal, fast, and end-to-end type-safe web framework for building APIs with Deno.
    </em>
</p>

<p align="center">
    <img src="https://img.shields.io/github/issues-closed/8borane8/webtools-expressapi.svg" alt="issues-closed" />
	&nbsp;
    <img src="https://img.shields.io/github/license/8borane8/webtools-expressapi.svg" alt="license" />
    &nbsp;
    <img src="https://img.shields.io/github/stars/8borane8/webtools-expressapi.svg" alt="stars" />
    &nbsp;
    <img src="https://img.shields.io/github/forks/8borane8/webtools-expressapi.svg" alt="forks" />
</p>

<hr>

## ✨ Features

- **Minimal API** - Intuitive Express.js-inspired syntax
- **End-to-end type safety** - Export your server type, get a fully typed client. No code generation, no contract file
- **Inferred route params** - `req.params.id` is typed from the URL string, without writing a schema
- **Typed middleware context** - Each middleware declares what it adds to `req.data`, and the compiler enforces ordering
- **Built-in validation** - Schema-based request validation that narrows `req.body`, `req.query` and `req.params`
- **Built-in CORS** - Per-router rules, merged on mount, OPTIONS preflight
- **Modular routing** - Organize routes with nested routers
- **Web standards** - Built on native Deno Web APIs
- **Zero runtime cost for types** - All inference is erased at compile time

## 📦 Installation

```bash
deno add jsr:@webtools/expressapi
```

## 🚀 Quick Start

```ts
import { HttpServer } from "jsr:@webtools/expressapi";

export const server = new HttpServer()
	.get("/", (_req, res) => res.json({ message: "Hello, World!" }))
	.get("/users/:id", (req, res) => res.json({ id: req.params.id }));

export type AppRouter = typeof server;

server.listen(5050);
```

Then, from anywhere, including a separate package:

```ts
import type { AppRouter } from "./server.ts";
import { HttpClient } from "jsr:@webtools/expressapi";

const client = new HttpClient<AppRouter>({ baseUrl: "http://localhost:5050" });

const user = await client.get("/users/:id", { params: { id: "42" } });
//    ^ { id: string }
```

> [!IMPORTANT]
> Routes must be registered by **chaining**. Each call returns a router type enriched with the new route, so a discarded
> return value is a lost route. See [Chaining is required](#chaining-is-required).

## 📖 Table of Contents

- [Type Safety](#type-safety)
- [Routing](#routing)
- [Request & Response](#request--response)
- [Middleware](#middleware)
- [Typed Client](#typed-client)
- [CORS](#cors)
- [Schema Validation](#schema-validation)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Examples](#examples)

## 🔒 Type Safety

Types flow from your route definitions to your client without any generation step. Four things are inferred.

### Chaining is required

The type information lives in the **type of the router**, accumulated one route at a time. Every route method returns
`this` widened with the route it just registered, so you must keep the returned value:

```ts
// ✅ Types accumulate
const server = new HttpServer()
	.get("/a", (_req, res) => res.json({ a: 1 }))
	.get("/b", (_req, res) => res.json({ b: 2 }));

// ❌ Routes work at runtime, but the type of `server` knows nothing about them,
//    so HttpClient<typeof server> sees no routes at all.
const server = new HttpServer();
server.get("/a", (_req, res) => res.json({ a: 1 }));
```

### Route params are inferred from the URL

No schema needed. The parameter names are read from the path string:

```ts
.get("/users/:userId/posts/:postId", (req, res) => {
	req.params.userId; // string
	req.params.postId; // string
	// @ts-expect-error 'nope' is not in the URL
	req.params.nope;
	return res.json({ ok: true });
})
```

### Schemas narrow the request

When a schema is provided it replaces the default type for that part of the request:

```ts
.post("/users", (req, res) => {
	req.body.name; // string
	req.body.age;  // number
	return res.json({ id: "1" });
}, [], {
	body: z.object({ name: z.string(), age: z.number() }),
})
```

| Request part | Without schema                        | With schema         |
| ------------ | ------------------------------------- | ------------------- |
| `params`     | inferred from the URL                 | the schema type     |
| `query`      | `Record<string, string \| undefined>` | the schema type     |
| `body`       | `unknown`                             | the schema type     |
| `data`       | what the middlewares added            | (not schema-driven) |

### Responses can be a union

A handler may return several different shapes. The client receives their union, and you narrow it however you like. The
framework imposes no `success` convention:

```ts
.get("/users/:id", (req, res) => {
	const user = findUser(req.params.id);
	if (!user) return res.json({ found: false as const });
	return res.json({ found: true as const, name: user.name });
})
```

```ts
const result = await client.get("/users/:id", { params: { id: "42" } });
//    ^ { found: false } | { found: true; name: string }

if (result.found) console.log(result.name); // narrowed
```

Use `as const` on discriminants so they stay literal types instead of widening to `boolean` or `string`.

A handler that returns nothing on some branch contributes nothing to the union: `void` is dropped.

### Middleware context accumulates

See [Middleware](#middleware). Each middleware declares what it adds to `req.data`, and what it requires from earlier
middlewares. The compiler rejects a wrong order.

## 🛣️ Routing

### HTTP Methods

All five methods share the same signature: `(url, handler, middlewares?, schemas?)`.

```ts
const server = new HttpServer()
	.get("/users", (_req, res) => res.json({ users: [] }))
	.post("/users", (_req, res) => res.status(201).json({ created: true }))
	.put("/users/:id", (req, res) => res.json({ updated: true, id: req.params.id }))
	.patch("/users/:id", (req, res) => res.json({ patched: true, id: req.params.id }))
	.delete("/users/:id", (_req, res) => res.status(204).send(null));
```

### Query Parameters

Query strings are parsed automatically. Without a schema, every value is `string | undefined`:

```ts
.get("/search", (req, res) => {
	const page = req.query.page ?? "1";
	return res.json({ query: req.query.q, page });
})
```

With a schema, values are validated and typed. See [Schema Validation](#schema-validation).

### Modular Routers

A `Router` groups routes and can be mounted on a server or another router. Its type parameter declares the `req.data`
context it expects the parent to provide:

```ts
import { Router } from "jsr:@webtools/expressapi";

type User = { id: string; name: string };

export const usersRouter = new Router<{ user: User }>()
	.get("/users", (_req, res) => res.json({ users: [] }))
	.get("/users/:id", (req, res) => res.json({ id: req.params.id, by: req.data.user.id }));
```

Mount it with a prefix, or with the prefix the router was built with:

```ts
const server = new HttpServer()
	.use(auth) // provides { user: User }
	.use("/api", usersRouter); // routes become /api/users, /api/users/:id
```

Prefixes combine, and they combine at the type level too:

```ts
const usersRouter = new Router("/users").get("/", handler); // internal route: /users
const server = new HttpServer().use("/api", usersRouter); // final route: /api/users
```

Mounting is checked at compile time against what the sub-router declared with `new Router<TData>()`. Middlewares the
child registers with its own `.use()` do **not** become requirements on the parent. They travel with the mounted routes:

```ts
// ❌ Parent is missing `user`.
new HttpServer().use("/api", usersRouter);

// ✅ Child expects `user` from the parent, then adds more context itself.
const orgs = new Router<{ user: User }>()
	.use(loadOrganization)
	.get("/", (req, res) => res.json({ org: req.data.organization }));

new HttpServer().use(auth).use("/orgs", orgs);
```

### URL Normalization

Route URLs and incoming request paths are both normalized, so matching is consistent regardless of how paths are
written. Consecutive slashes collapse to one, and trailing slashes are removed (except for the root `/`).

```ts
// Equivalent definitions
.get("/users", handler)
.get("/users/", handler)
.get("//users", handler)

// All of these match /users
// GET /users      GET /users/      GET //users      GET /users///
```

## 📥 Request & Response

### Request

```ts
.post("/data", (req, res) => {
	req.url;     // pathname
	req.method;  // HTTP method
	req.headers; // Headers
	req.body;    // parsed body
	req.query;   // query parameters
	req.params;  // route parameters
	req.cookies; // parsed cookies, URI-decoded
	req.ip;      // client IP, or null
	req.data;    // context filled by middlewares
	req.raw;     // original Request
	return res.json({ ok: true });
})
```

Fill `req.data` key by key rather than replacing it, otherwise you discard whatever earlier middlewares put there:

```ts
req.data.user = user; // ✅
req.data = { user }; // ❌ drops the keys added upstream
```

`query`, `params` and `cookies` are read-only and populated by the server; `data` and `body` are the two you write to.

### Body Parsing

The body is parsed from `Content-Type`. `GET` requests are never given a body.

| Content-Type                        | `req.body`                        |
| ----------------------------------- | --------------------------------- |
| `application/json`                  | parsed JSON                       |
| `multipart/form-data`               | object of fields, files as `File` |
| `application/x-www-form-urlencoded` | object of fields                  |
| anything else                       | raw text                          |

A malformed body yields `null` rather than throwing.

### Response

```ts
res.json({ message: "Success" }); // 200 JSON
res.status(201).json({ created: true }); // custom status
res.send("Plain text"); // raw body
res.redirect("/new-location", 301); // redirect
await res.sendFile("/path/to/file.pdf"); // stream a file
res.type("xml").send("<root></root>"); // set content type
res.setHeader("X-Custom", "value").json({}); // set headers
```

`res.json()` is what carries the response type. It returns a `TypedResponse<T>`, a real `Response` with a phantom type
recording the body shape. This is what the client reads. `res.send()` and `res.redirect()` return a plain `Response`, so
they contribute no type information.

## 🔌 Middleware

A middleware is a listener that may fill `req.data` and may short-circuit the chain by returning a response. What makes
it typed is its contract: `Middleware<TAdds, TNeeds>`.

- `TAdds`: what it puts into `req.data`, made available to everything registered afterwards.
- `TNeeds`: what it requires an earlier middleware to have put there.

```ts
import { HttpServer, type Middleware } from "jsr:@webtools/expressapi";

type User = { id: string; name: string; role: "admin" | "user" };

const trace: Middleware<{ requestId: string }> = (req) => {
	req.data.requestId = crypto.randomUUID();
};

const auth: Middleware<{ user: User }> = (req, res) => {
	const token = req.headers.get("authorization");
	if (!token) return res.status(401).json({ error: "Unauthorized" });
	req.data.user = { id: "1", name: "Alice", role: "admin" };
};

// Requires `auth` to have run first.
const requireAdmin: Middleware<{ admin: boolean }, { user: User }> = (req) => {
	req.data.admin = req.data.user.role === "admin";
};
```

Registering them accumulates the context:

```ts
const server = new HttpServer()
	.use(trace)
	.use(auth)
	.use(requireAdmin)
	.get("/me", (req, res) =>
		res.json({
			requestId: req.data.requestId, // string
			name: req.data.user.name, // string
			admin: req.data.admin, // boolean
		}));
```

Order is enforced by the compiler. Registering `requireAdmin` without `auth` before it fails with the reason spelled out
in the error:

```ts
// ❌ This middleware depends on context data that is missing.
//    Register the middleware that provides it first.
new HttpServer().use(requireAdmin);
```

### Scope: global vs per-route

> [!WARNING]
> `use()` registers a middleware for the **whole router**. At runtime it runs for every route of that router, including
> routes registered _before_ the `use()` call, and routes coming from mounted sub-routers. Only the **types** follow
> registration order.

This trips people up on login endpoints. A route registered before `.use(auth)` does not see `req.data.user` in its
handler, but `auth` still runs for it:

```ts
const server = new HttpServer()
	.post("/login", (_req, res) => res.json({ token: "..." })) // still requires a token at runtime!
	.use(auth);
```

To keep a route public, do not use a global middleware. Pass it per route instead.

### The `middleware()` helper

Annotating a named constant is the usual way. Use the `middleware()` helper when you need an **inline** middleware,
where there is no constant to annotate. `TAdds` cannot be inferred from the function body:

```ts
import { middleware } from "jsr:@webtools/expressapi";

const server = new HttpServer()
	.use(middleware<{ requestId: string }>((req) => {
		req.data.requestId = crypto.randomUUID();
	}))
	.get("/", (req, res) => res.json({ id: req.data.requestId }));
```

### Route-Specific Middleware

The third argument of a route method takes middlewares that run **only for that route**, after the global ones. This is
how you protect some routes while leaving others public. Within the array, `TAdds` / `TNeeds` chain exactly like
successive `.use()` calls, and the handler sees the accumulated context:

```ts
const server = new HttpServer()
	.post("/login", (_req, res) => res.json({ token: "..." })) // public
	.get("/profile", (req, res) => {
		return res.json({ id: req.data.user.id, admin: req.data.admin });
	}, [auth, requireAdmin]); // protected, fully typed
```

Order is enforced inside the array too:

```ts
// ❌ This middleware depends on context data that is missing.
.get("/admin", (_req, res) => res.json({ ok: true }), [requireAdmin])

// ❌ Same error: requireAdmin runs before auth has provided `user`.
.get("/admin", (_req, res) => res.json({ ok: true }), [requireAdmin, auth])
```

Use a **global** middleware when many routes share the same context, and a **per-route** array when only some routes
need it. Both are fully typed.

### Execution Order

1. CORS headers
2. Route params extraction
3. Schema validation (`query`, `params`, `body`)
4. Global middlewares, in registration order
5. Route middlewares
6. Route handler

Returning a response from any step stops the chain. Returning nothing continues.

## 🌐 Typed Client

`HttpClient` is typed by the server's type. It has no runtime dependency on the server, so `import type` is enough and
the server module is never evaluated. Nothing starts, no port opens.

```ts
// server.ts
export const server = new HttpServer()
	.get("/users/:id", (req, res) => res.json({ id: req.params.id, name: "Alice" }))
	.post("/users", (req, res) => res.json({ id: "1", name: req.body.name }), [], {
		body: z.object({ name: z.string() }),
	});

export type AppRouter = typeof server;
```

```ts
// client.ts (could be another package entirely)
import type { AppRouter } from "./server.ts";
import { HttpClient, HttpClientError } from "jsr:@webtools/expressapi";

const client = new HttpClient<AppRouter>({
	baseUrl: "http://localhost:5050",
	headers: { authorization: "Bearer token" },
});

const user = await client.get("/users/:id", { params: { id: "42" } });
//    ^ { id: string; name: string }

const created = await client.post("/users", { body: { name: "Charlie" } });
//    ^ { id: string; name: string }
```

URLs, methods, params, query, body and response are all checked:

```ts
await client.get("/nope"); // ❌ unknown URL
await client.post("/users/:id", { params: { id: "1" } }); // ❌ no POST on this URL
await client.get("/users/:id"); // ❌ params are required
await client.get("/users/:id", { params: { id: 1 } }); // ❌ id must be a string
await client.post("/users", { body: { name: 42 } }); // ❌ name must be a string
```

The `input` argument is optional when the route requires neither params, nor query, nor body. `headers` may always be
passed, and is merged over the client's own headers.

### Errors

Any response outside the 2xx range throws an `HttpClientError` carrying the parsed body:

```ts
try {
	await client.get("/users/:id", { params: { id: "42" } });
} catch (error) {
	if (error instanceof HttpClientError) {
		console.error(error.status); // 404
		console.error(error.body); // parsed response body
		console.error(error.url); // full requested URL
	}
}
```

Because non-2xx responses throw, the shapes your handler returns with an error status never reach the return type. If
you want a failure shape to be part of the returned union, send it with a 2xx status.

### Options

```ts
new HttpClient<AppRouter>({
	baseUrl: "http://localhost:5050", // trailing slashes are trimmed
	headers: { authorization: "Bearer token" }, // sent on every request
	fetch: customFetch, // alternative fetch, useful in tests
});
```

Empty responses (`204`) yield `null`. Non-JSON responses are returned as text rather than throwing.

## 🌍 CORS

`HttpServer` applies CORS headers on every matched route and on **OPTIONS** preflight responses. You do not need a
manual CORS middleware unless you add non-standard headers.

### Defaults

`HttpServer` ships with permissive defaults: wildcard origin, the five methods plus `OPTIONS`,
`Access-Control-Allow-Headers: *`, a one-day `Access-Control-Max-Age`, and credentials disabled. Override them with
`cors()` on the server or on any `Router` you mount.

### `router.cors(rules)`

Rules attached to a router become the defaults for its routes. When the router is mounted, each route gets a merged
`cors` field, later entries overriding earlier ones:

1. Parent router's rules
2. Mounted router's rules
3. The route's own `cors`, if any

```ts
import { HttpServer, Router } from "jsr:@webtools/expressapi";

const api = new Router("/v1")
	.cors({ allowOrigin: "https://app.example.com", maxAge: "7200" })
	.get("/health", (_req, res) => res.json({ ok: true }));

const server = new HttpServer()
	.cors({ allowOrigin: "*" })
	.use(api);
```

### Preflight

For `OPTIONS`, the server responds **204** with CORS headers. To decide which route's rules apply when several methods
share a path, it reads `Access-Control-Request-Method` and resolves the route for that method. If the header is missing
or unknown, it falls back to the first route matching the path, iterating `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

### Dynamic values

`allowOrigin`, `allowMethods` and `allowHeaders` accept a string or a function `(req) => string | undefined`, possibly
async, useful to reflect the `Origin` header when using credentials. When the resolved origin is not `*`, a
`Vary: Origin` header is added automatically.

```ts
import type { CorsRules } from "jsr:@webtools/expressapi";

const rules: CorsRules = {
	allowOrigin: (req) => req.headers.get("origin") ?? undefined,
	allowCredentials: true,
};
```

## ✅ Schema Validation

Schemas validate at runtime **and** narrow the request type at compile time. They are passed as the fourth argument of a
route method.

```ts
import { z } from "jsr:@webtools/expressapi";

const server = new HttpServer()
	.post(
		"/users",
		(req, res) => {
			const { name, email, age } = req.body; // typed and validated
			return res.status(201).json({ name, email, age });
		},
		[],
		{
			body: z.object({
				name: z.string().min(3).max(50),
				email: z.string().email(),
				age: z.optional(z.number().int().positive()),
			}),
		},
	);
```

`query` and `params` work the same way. Validating `params` is only needed when you want more than `string`:

```ts
.get("/users/:id", (req, res) => res.json({ id: req.params.id }), [], {
	params: z.object({ id: z.string().uuid() }),
})
```

### Optional keys

`z.optional()` marks a key optional in the inferred type as well, so an omitted key stays absent instead of becoming
`undefined`:

```ts
const schema = z.object({ q: z.string(), page: z.optional(z.string()) });
// inferred as { q: string; page?: string }
```

### Validation errors

Invalid data returns a 400 before the handler runs:

```json
{
	"success": false,
	"error": "400 Bad Request.",
	"details": [
		{
			"path": ["email"],
			"message": "Invalid email format",
			"code": "invalid_string"
		}
	]
}
```

### Available schemas

```ts
// Strings
z.string();
z.string().min(3).max(100).length(10);
z.string().email().uuid().url();
z.string().regex(/^[A-Z]+$/);
z.string().startsWith("prefix").endsWith("suffix");

// Numbers
z.number();
z.number().int().positive().negative();
z.number().min(0).max(100);

// Booleans and files
z.boolean();
z.file();

// Composites
z.object({ name: z.string(), age: z.number() });
z.array(z.string()).min(1).max(10).length(5);
z.union([z.string(), z.number()]);
z.enum(["red", "green", "blue"]);
z.optional(z.string()); // string | undefined, key becomes optional
z.nullable(z.string()); // string | null
z.any();
```

Every builder takes an optional custom message as its last argument, for example `z.string("Name is required")`.

Objects and arrays also accept a JSON **string**, which they parse before validating. This lets you validate structured
data arriving through a query parameter or a form field.

## 🚀 Advanced Usage

### Fetch Handler

`server.fetch` exposes the server as a standard fetch handler, `(Request, info?) => Promise<Response>`. Use it to pass
custom options to `Deno.serve` instead of `listen()`:

```ts
Deno.serve({ port: 5050, hostname: "127.0.0.1" }, server.fetch);
```

It also makes tests fast and portless:

```ts
Deno.test("GET /users/:id", async () => {
	const response = await server.fetch(new Request("http://localhost/users/42"));
	assertEquals((await response.json()).id, "42");
});
```

The optional second argument carries the TCP remote address. When absent, as in tests, `req.ip` falls back to
`x-forwarded-for` if `trustProxy` is enabled, otherwise `null`.

### Custom 404 Handler

```ts
server.notFound((req, res) =>
	res.status(404).json({
		error: "Not Found",
		path: req.url,
		method: req.method,
	})
);
```

A handler that returns nothing falls back to the default 404 JSON response.

### Error Handling

Any error thrown by a middleware, a handler, or the validation layer is caught and forwarded to the global error
handler. By default the server replies with a 500 JSON error:

```ts
server.onError((error, req, res) =>
	res.status(500).json({
		success: false,
		error: "Internal Server Error",
		message: error instanceof Error ? error.message : String(error),
	})
);
```

Returning nothing falls back to the default 500 response.

### Client IP & Reverse Proxies

`req.ip` is the remote address of the TCP connection by default, which cannot be spoofed by headers. Behind a trusted
reverse proxy, enable `trustProxy` to read the first entry of `x-forwarded-for` instead:

```ts
const server = new HttpServer({ trustProxy: true });
```

Only enable it when a trusted proxy sets the header, otherwise clients can spoof their IP.

### Dynamic Route Registration

`addRoute()` registers a route from a plain object, with the same typing as `get` / `post` / …: schemas, middleware
chain, params inference and the response shape all feed into `HttpClient`:

```ts
import { HttpMethods, HttpServer, z } from "jsr:@webtools/expressapi";

const server = new HttpServer()
	.addRoute({
		url: "/users/:id",
		method: HttpMethods.GET,
		requestListener: (req, res) => res.json({ id: req.params.id }),
	})
	.addRoute({
		url: "/users",
		method: HttpMethods.POST,
		requestListener: (req, res) => res.status(201).json({ name: req.body.name }),
		schemas: { body: z.object({ name: z.string() }) },
	});
```

Registering the same method and URL twice throws. If the object is built dynamically (`url: string` rather than a
literal), the client loses the precise URL union. Prefer string literals when you care about typing.

## 📚 API Reference

### HttpServer

```ts
class HttpServer extends Router
```

**Constructor**

- `new HttpServer(options?: HttpServerOptions)`: the server does not start automatically.
  - `options.trustProxy` (default `false`): resolve `req.ip` from `x-forwarded-for`. Only behind a trusted proxy.

**Methods**: everything from `Router`, plus:

- `listen(port: number): void`: start serving
- `fetch(request: Request, info?): Promise<Response>`: standard fetch handler
- `notFound(handler: RequestListener): this`: custom 404
- `onError(handler: ErrorListener): this`: custom global error handler

### Router

```ts
class Router<TData = Record<never, never>>
```

`TData` declares the `req.data` context this router expects its parent to provide.

**Constructor**

- `new Router<TData>(prefix?: string)`: prefix defaults to `"/"`

**Methods**

- `get(url, handler, middlewares?, schemas?)`: and `post`, `put`, `patch`, `delete`. Returns the router type widened
  with the new route.
- `use(middleware)`: add a global middleware, widening `req.data` for what follows
- `use(prefix, router)`: mount a router under a prefix, combining with the router's own prefix
- `use(router)`: mount a router using its own prefix
- `cors(rules: CorsRules): this`: default CORS rules for this router
- `addRoute(route): this`: same inference as `get` / `post` / …, from a route object

### HttpRequest

```ts
class HttpRequest<TCtx extends RequestContext = DefaultContext>
```

| Property  | Type                     | Notes                                                   |
| --------- | ------------------------ | ------------------------------------------------------- |
| `url`     | `string`                 | pathname, normalized                                    |
| `method`  | `HttpMethods`            |                                                         |
| `headers` | `Headers`                |                                                         |
| `body`    | `TCtx["body"]`           | schema type, else `unknown`                             |
| `query`   | `TCtx["query"]`          | schema type, else `Record<string, string \| undefined>` |
| `params`  | `TCtx["params"]`         | schema type, else inferred from the URL                 |
| `data`    | `TCtx["data"]`           | what the middlewares added                              |
| `cookies` | `Record<string, string>` | URI-decoded                                             |
| `ip`      | `string \| null`         | TCP address, or `x-forwarded-for` when `trustProxy`     |
| `raw`     | `Request`                | original request                                        |

### HttpResponse

- `status(code: number): HttpResponse`
- `setHeader(name: string, value: string): HttpResponse`
- `getHeader(name: string): string | null`
- `type(type: string): HttpResponse`
- `size(size: number): HttpResponse`
- `json<T>(body: T): TypedResponse<T>`: carries the response type used by the client
- `send(body: BodyInit | null): Response`
- `redirect(url: string, code?: number): Response`: defaults to 307
- `sendFile(path: string): Promise<Response>`: throws if the path does not exist

### HttpClient

```ts
class HttpClient<TRoutes>
```

`TRoutes` accepts a server or router type, typically `typeof server` imported with `import type`.

**Constructor**

- `new HttpClient<TRoutes>(options: HttpClientOptions)`
  - `baseUrl: string`: trailing slashes trimmed
  - `headers?: Record<string, string>`: sent on every request
  - `fetch?: typeof fetch`: alternative implementation

**Methods**

- `get(url, input?)`: and `post`, `put`, `patch`, `delete`. `input` accepts `params`, `query`, `body` and `headers`,
  each required only when the route needs it. Resolves to the union of the handler's response shapes.

**HttpClientError**: thrown on any non-2xx response, with `status: number`, `body: unknown` and `url: string`.

### Middleware

```ts
type Middleware<TAdds = Record<never, never>, TNeeds = Record<never, never>>
function middleware<TAdds, TNeeds>(listener): Middleware<TAdds, TNeeds>
```

`TAdds` is added to `req.data`; `TNeeds` is required from an earlier middleware. Annotate a constant with the type, or
call the helper for inline middlewares.

### Helpers

**CryptoHelper**

```ts
CryptoHelper.sha256(payload: string): Promise<string>
CryptoHelper.sha512(payload: string): Promise<string>
CryptoHelper.hash(payload: string, algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"): Promise<string>
CryptoHelper.secureRandom(): number
```

Hashes are returned as lowercase hex. `secureRandom()` returns a cryptographically random float in `[0, 1]`.

**StringHelper**

```ts
StringHelper.generateRandomString(pattern?: string, chars?: string): string
StringHelper.encodeBase64Url(data: string): string
StringHelper.decodeBase64Url(data: string): string
StringHelper.normalizePath(...parts: string[]): string
StringHelper.slugify(str: string): string
StringHelper.escapeHtml(str: string): string
StringHelper.unescapeHtml(str: string): string
StringHelper.clean(str: string): string
```

`generateRandomString` replaces each `X` in the pattern, defaulting to `"XXXX-XXXX-XXXX-XXXX"`.

### JsonToken

A small JWT-like signer for JSON payloads, using SHA-256 and Base64URL. Format: `{base64url(payload)}.{signature}`.

```ts
class JsonToken {
	constructor(secret: string);
	sign(payload: unknown): Promise<string>;
	verify<T>(token: string, schema?: Schema<T>): Promise<T | null>;
}
```

Signing encodes the payload, appends the secret, and hashes the result. Verifying recomputes the signature and compares
it in constant time to prevent timing attacks. An invalid token returns `null` instead of throwing. Passing a schema to
`verify` validates the decoded payload, which is the safest way to trust its shape:

```ts
import { JsonToken, z } from "jsr:@webtools/expressapi";

const tokens = new JsonToken(Deno.env.get("JWT_SECRET")!);
const payloadSchema = z.object({ userId: z.string(), role: z.string() });

const jwt = await tokens.sign({ userId: "1", role: "admin" });
const payload = await tokens.verify(jwt, payloadSchema);
//    ^ { userId: string; role: string } | null
```

There is no expiration or refresh mechanism. For those, use a full JWT library.

## 💡 Examples

### REST API with a typed client

```ts
// server.ts
import { HttpServer, z } from "jsr:@webtools/expressapi";

export const server = new HttpServer()
	.get("/users", (_req, res) => res.json({ users: [] as { id: string; name: string }[] }))
	.get("/users/:id", (req, res) => res.json({ id: req.params.id, name: "Alice" }))
	.post("/users", (req, res) => res.status(201).json({ id: "1", name: req.body.name }), [], {
		body: z.object({ name: z.string().min(3), email: z.string().email() }),
	})
	.put("/users/:id", (req, res) => res.json({ updated: true, id: req.params.id }))
	.delete("/users/:id", (_req, res) => res.status(204).send(null));

export type AppRouter = typeof server;

if (import.meta.main) server.listen(5050);
```

```ts
// client.ts
import type { AppRouter } from "./server.ts";
import { HttpClient } from "jsr:@webtools/expressapi";

const client = new HttpClient<AppRouter>({ baseUrl: "http://localhost:5050" });

const users = await client.get("/users");
const user = await client.get("/users/:id", { params: { id: "1" } });
const created = await client.post("/users", { body: { name: "Charlie", email: "c@example.com" } });
```

Guarding `listen()` behind `import.meta.main` matters: it keeps `server.ts` importable for its type alone, so the client
never starts a server.

### Token authentication with typed context

```ts
import { HttpServer, JsonToken, type Middleware, z } from "jsr:@webtools/expressapi";

type Session = { userId: string; role: string };

const tokens = new JsonToken(Deno.env.get("JWT_SECRET") ?? "dev-secret");
const sessionSchema = z.object({ userId: z.string(), role: z.string() });

const authenticate: Middleware<{ session: Session }> = async (req, res) => {
	const header = req.headers.get("authorization");
	if (!header?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Missing authorization header" });
	}

	const session = await tokens.verify(header.slice(7), sessionSchema);
	if (!session) return res.status(401).json({ error: "Invalid token" });

	req.data.session = session;
};

const requireAdmin: Middleware<{ isAdmin: boolean }, { session: Session }> = (req, res) => {
	if (req.data.session.role !== "admin") return res.status(403).json({ error: "Forbidden" });
	req.data.isAdmin = true;
};

export const server = new HttpServer()
	.use(authenticate)
	.get("/profile", (req, res) => res.json({ userId: req.data.session.userId }))
	.get("/admin", (req, res) => res.json({ role: req.data.session.role }), [requireAdmin]);
```

Every route here requires a token, because `authenticate` is global. The login endpoint that issues tokens must
therefore live outside this server, or be registered without a global middleware:

```ts
export const publicServer = new HttpServer()
	.post(
		"/login",
		async (req, res) => {
			const token = await tokens.sign({ userId: "1", role: "admin" });
			return res.json({ token, email: req.body.email });
		},
		[],
		{
			body: z.object({ email: z.string().email(), password: z.string().min(6) }),
		},
	);
```

### File upload

```ts
.post("/upload", (req, res) => {
	const file = req.body.file;
	return res.json({ uploaded: true, name: file.name, size: file.size });
}, [], {
	body: z.object({ file: z.file() }),
})
```

## License

Distributed under the MIT License. See [LICENCE](LICENCE) for more information.
