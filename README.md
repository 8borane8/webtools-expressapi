<h1 align="center">ExpressAPI</h1>

<p align="center">
    <em>
        A minimal, fast, and type-safe web framework for building APIs with Deno.
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
- **Type Safety** - Full TypeScript support with type inference
- **Built-in Validation** - Schema-based request validation
- **Middleware Support** - Global and per-route middleware
- **Modular Routing** - Organize routes with nested routers
- **Web Standards** - Built on native Deno Web APIs
- **Zero Dependencies** - Lightweight and fast

## 📦 Installation

```bash
deno add jsr:@webtools/expressapi
```

## 🚀 Quick Start

```ts
import { HttpServer } from "jsr:@webtools/expressapi";

const server = new HttpServer(5050);

server.get("/", (req, res) => {
	return res.json({ message: "Hello, World!" });
});

server.post("/users", (req, res) => {
	const user = req.body;
	return res.status(201).json({ created: true, user });
});

server.listen();
```

## 📖 Table of Contents

- [Getting Started](#getting-started)
- [Routing](#routing)
- [Request & Response](#request--response)
- [Middleware](#middleware)
- [Schema Validation](#schema-validation)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Examples](#examples)

## 🎯 Getting Started

### Creating a Server

```ts
import { HttpServer } from "jsr:@webtools/expressapi";

// Default port is 5050
const server = new HttpServer(5050);

// Start the server
server.listen();
console.log("Server running on http://localhost:5050");
```

### Basic Route

```ts
server.get("/hello", (req, res) => {
	return res.json({ message: "Hello, World!" });
});
```

## 🛣️ Routing

### HTTP Methods

ExpressAPI supports all standard HTTP methods:

```ts
server.get("/users", (req, res) => {
	return res.json({ users: [] });
});

server.post("/users", (req, res) => {
	return res.status(201).json({ created: true });
});

server.put("/users/:id", (req, res) => {
	return res.json({ updated: true, id: req.params.id });
});

server.patch("/users/:id", (req, res) => {
	return res.json({ patched: true, id: req.params.id });
});

server.delete("/users/:id", (req, res) => {
	return res.status(204).send(null);
});
```

### Route Parameters

Access dynamic route segments via `req.params`:

```ts
server.get("/users/:id", (req, res) => {
	const userId = req.params.id;
	return res.json({ userId });
});

server.get("/users/:userId/posts/:postId", (req, res) => {
	return res.json({
		userId: req.params.userId,
		postId: req.params.postId,
	});
});
```

### Query Parameters

Query strings are automatically parsed:

```ts
server.get("/search", (req, res) => {
	const { q, page = "1", limit = "10" } = req.query;
	return res.json({
		query: q,
		page: parseInt(page),
		limit: parseInt(limit),
	});
});
```

### URL Normalization

ExpressAPI automatically normalizes all route URLs and incoming request paths. This ensures consistent route matching
regardless of how URLs are written.

**Normalization rules:**

- Multiple consecutive slashes are collapsed to a single slash
- Trailing slashes are removed (except for the root path `/`)
- Leading slashes are normalized

**Examples:**

```ts
// These route definitions are equivalent:
server.get("/users", handler);
server.get("/users/", handler); // Trailing slash removed
server.get("//users", handler); // Multiple slashes normalized

// These requests all match the same route:
// GET /users      → matches /users
// GET /users/     → matches /users (trailing slash removed)
// GET //users     → matches /users (multiple slashes normalized)
// GET /users///   → matches /users (normalized)
```

**Note:** The root path `/` is preserved and not normalized. All other paths are normalized to remove trailing slashes
and collapse multiple slashes.

## 📥 Request & Response

### Request Object

The `HttpRequest` object provides access to request data:

```ts
server.post("/data", (req, res) => {
	// Request properties
	console.log(req.url); // Pathname
	console.log(req.method); // HTTP method
	console.log(req.headers); // Headers object
	console.log(req.body); // Parsed body
	console.log(req.query); // Query parameters
	console.log(req.params); // Route parameters
	console.log(req.cookies); // Parsed cookies
	console.log(req.ip); // Client IP address
	console.log(req.raw); // Original Request object

	// Custom data context
	req.data = { userId: 123 };

	return res.json({ success: true });
});
```

### Response Methods

```ts
// JSON response (default status 200)
res.json({ message: "Success" });

// Custom status code
res.status(201).json({ created: true });

// Text response
res.status(200).send("Plain text");

// Redirect
res.redirect("/new-location", 301);

// Send file
res.sendFile("/path/to/file.pdf");

// Custom headers
res.setHeader("X-Custom-Header", "value")
	.setHeader("X-Another", "value2")
	.json({ data: "..." });

// Set content type
res.type("xml").send("<root></root>");
```

### Request Body Parsing

The body is automatically parsed based on `Content-Type`:

```ts
// JSON (application/json)
server.post("/json", (req, res) => {
	const { name, email } = req.body;
	return res.json({ name, email });
});

// Form data (multipart/form-data)
server.post("/upload", (req, res) => {
	const formData = req.body; // Object with form fields
	return res.json({ received: formData });
});

// URL encoded (application/x-www-form-urlencoded)
server.post("/form", (req, res) => {
	const data = req.body; // Parsed as object
	return res.json({ data });
});
```

## 🔌 Middleware

### Global Middleware

Global middleware runs before all routes:

```ts
// Logging middleware
server.use((req, res) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
});

// CORS middleware
server.use((req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");

	if (req.method === "OPTIONS") {
		return res.status(200).send(null);
	}
});
```

### Route-Specific Middleware

Apply middleware to specific routes:

```ts
const authenticate = (req, res) => {
	const token = req.headers.get("authorization");
	if (!token || !token.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	// Attach user data to request
	req.data = { userId: 123 };
};

const requireAdmin = (req, res) => {
	if (req.data?.role !== "admin") {
		return res.status(403).json({ error: "Forbidden" });
	}
};

server.get(
	"/admin/users",
	(req, res) => {
		return res.json({ users: [] });
	},
	[authenticate, requireAdmin],
);
```

### Middleware Chain

Middleware executes in order. Return a response to stop the chain:

```ts
const middleware1 = (req, res) => {
	console.log("Middleware 1");
	// Continue to next middleware
};

const middleware2 = (req, res) => {
	console.log("Middleware 2");
	// Stop chain by returning response
	return res.status(403).json({ error: "Blocked" });
};

const middleware3 = (req, res) => {
	// This won't execute if middleware2 returns
	console.log("Middleware 3");
};
```

## ✅ Schema Validation

ExpressAPI includes a powerful schema validation system for type-safe request validation.

### Basic Validation

```ts
import { z } from "jsr:@webtools/expressapi";

server.post(
	"/users",
	(req, res) => {
		// req.body is now typed and validated
		const { name, email, age } = req.body;
		return res.status(201).json({ user: { name, email, age } });
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

### Validating Query Parameters

```ts
server.get(
	"/users",
	(req, res) => {
		// req.query is validated and typed
		const { page, limit } = req.query;
		return res.json({ page, limit });
	},
	[],
	{
		query: z.object({
			page: z.optional(z.number().int().positive()),
			limit: z.optional(z.number().int().positive().max(100)),
		}),
	},
);
```

### Validating Route Parameters

```ts
server.get(
	"/users/:id",
	(req, res) => {
		// req.params.id is validated as UUID
		return res.json({ userId: req.params.id });
	},
	[],
	{
		params: z.object({
			id: z.string().uuid(),
		}),
	},
);
```

### Validation Error Response

Invalid data automatically returns a 400 response:

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

### Schema Types

#### String Schemas

```ts
z.string(); // Basic string
z.string().min(3); // Minimum length
z.string().max(100); // Maximum length
z.string().length(10); // Exact length
z.string().email(); // Email validation
z.string().uuid(); // UUID validation
z.string().url(); // URL validation
z.string().regex(/^[A-Z]+$/); // Regex pattern
z.string().startsWith("prefix"); // Must start with
z.string().endsWith("suffix"); // Must end with
```

#### Number Schemas

```ts
z.number(); // Basic number
z.number().int(); // Integer only
z.number().positive(); // Must be positive
z.number().negative(); // Must be negative
z.number().min(0); // Minimum value
z.number().max(100); // Maximum value
```

#### Composite Schemas

```ts
// Objects
z.object({
	name: z.string(),
	age: z.number(),
	email: z.string().email(),
});

// Arrays
z.array(z.string()); // Array of strings
z.array(z.string()).min(1); // At least 1 item
z.array(z.string()).max(10); // At most 10 items
z.array(z.string()).length(5); // Exactly 5 items

// Optional and nullable
z.optional(z.string()); // string | undefined
z.nullable(z.string()); // string | null

// Unions
z.union([z.string(), z.number()]); // string | number

// Enums
z.enum(["red", "green", "blue"]); // "red" | "green" | "blue"

// Any
z.any(); // Any value
```

## 🚀 Advanced Usage

### Modular Routers

Organize routes into separate modules:

#### Option 1: Prefix in Constructor

```ts
// routes/users.ts
import { Router, z } from "jsr:@webtools/expressapi";

// Create router with prefix
export const usersRouter = new Router("/api/users");

usersRouter.get("/", (req, res) => {
	return res.json({ users: [] });
});

usersRouter.post(
	"/",
	(req, res) => {
		return res.status(201).json({ user: req.body });
	},
	[],
	{
		body: z.object({
			name: z.string().min(3),
			email: z.string().email(),
		}),
	},
);

usersRouter.get("/:id", (req, res) => {
	return res.json({ userId: req.params.id });
});
```

```ts
// server.ts
import { HttpServer } from "jsr:@webtools/expressapi";
import { usersRouter } from "./routes/users.ts";

const server = new HttpServer(5050);

// Mount router (prefix already applied)
server.use(usersRouter);
// Routes: /api/users, /api/users/:id

server.listen();
```

#### Option 2: Prefix on Mount

```ts
// routes/users.ts
import { Router, z } from "jsr:@webtools/expressapi";

export const usersRouter = new Router();

usersRouter.get("/", (req, res) => {
	return res.json({ users: [] });
});

usersRouter.get("/:id", (req, res) => {
	return res.json({ userId: req.params.id });
});
```

```ts
// server.ts
import { HttpServer } from "jsr:@webtools/expressapi";
import { usersRouter } from "./routes/users.ts";

const server = new HttpServer(5050);

// Mount router with prefix
server.use("/api/users", usersRouter);
// Routes: /api/users, /api/users/:id

server.listen();
```

#### Option 3: Combined Prefixes

Prefixes can be combined when mounting:

```ts
// routes/users.ts
const usersRouter = new Router("/users");
usersRouter.get("/", handler);
// Internal routes: /users

// server.ts
server.use("/api", usersRouter);
// Final routes: /api/users
```

### Custom 404 Handler

```ts
server.notFound((req, res) => {
	return res.status(404).json({
		error: "Not Found",
		path: req.url,
		method: req.method,
	});
});
```

### Type-Safe Data Context

Use generics for type-safe request data:

```ts
interface AppData {
	userId: number;
	role: string;
}

const server = new HttpServer<AppData>(5050);

server.use((req, res) => {
	// Type-safe data assignment
	req.data = { userId: 123, role: "admin" };
});

server.get("/profile", (req, res) => {
	// req.data is typed as AppData
	const { userId, role } = req.data;
	return res.json({ userId, role });
});

server.listen();
```

### Error Handling

```ts
server.use((req, res) => {
	try {
		// Your code
	} catch (error) {
		return res.status(500).json({
			error: "Internal Server Error",
			message: error.message,
		});
	}
});
```

## 📚 API Reference

### HttpServer

```ts
class HttpServer<TData = DataDefault> extends Router<TData>
```

**Constructor:**

- `new HttpServer(port?: number)` - Create a server on the specified port (default: 5050). Inherits from `Router` with
  default prefix "/". The server does not start automatically - call `listen()` to start it.

**Methods:**

- `listen()` - Start the server and begin listening for requests
- `get<TSchemas>(url, handler, middlewares?, schemas?)` - Register GET route
- `post<TSchemas>(url, handler, middlewares?, schemas?)` - Register POST route
- `put<TSchemas>(url, handler, middlewares?, schemas?)` - Register PUT route
- `patch<TSchemas>(url, handler, middlewares?, schemas?)` - Register PATCH route
- `delete<TSchemas>(url, handler, middlewares?, schemas?)` - Register DELETE route
- `use(middleware)` - Add global middleware
- `use(prefix, router)` - Mount router with prefix (combines with router's own prefix)
- `use(router)` - Mount router (uses router's own prefix)
- `notFound(handler)` - Custom 404 handler

### Router

```ts
class Router<TData = DataDefault>
```

**Constructor:**

- `new Router(prefix?: string)` - Create a router with an optional prefix (default: "/")

**Methods:**

- `get<TSchemas>(url, handler, middlewares?, schemas?)` - Register GET route
- `post<TSchemas>(url, handler, middlewares?, schemas?)` - Register POST route
- `put<TSchemas>(url, handler, middlewares?, schemas?)` - Register PUT route
- `patch<TSchemas>(url, handler, middlewares?, schemas?)` - Register PATCH route
- `delete<TSchemas>(url, handler, middlewares?, schemas?)` - Register DELETE route
- `use(middleware)` - Add global middleware
- `use(prefix, router)` - Mount router with prefix (combines with router's own prefix)
- `use(router)` - Mount router (uses router's own prefix)

Same methods as `HttpServer` but doesn't start a server. The prefix is automatically applied to all routes when the
router is used directly or mounted.

### HttpRequest

```ts
class HttpRequest<TData, TRouteTypes>
```

**Properties:**

- `url: string` - Request pathname
- `method: HttpMethods` - HTTP method
- `headers: Headers` - Request headers
- `body: TRouteTypes["body"]` - Parsed request body
- `query: TRouteTypes["query"]` - Query parameters
- `params: TRouteTypes["params"]` - Route parameters
- `cookies: Record<string, string>` - Parsed cookies
- `ip: string | null` - Client IP address
- `data: TData` - Custom data context
- `raw: Request` - Original Request object

### HttpResponse

```ts
class HttpResponse
```

**Methods:**

- `status(code: number): HttpResponse` - Set status code
- `setHeader(name: string, value: string): HttpResponse` - Set header
- `type(type: string): HttpResponse` - Set content type
- `size(size: number): HttpResponse` - Set content length
- `json(body: unknown): Response` - Send JSON response
- `send(body: BodyInit | null): Response` - Send response
- `redirect(url: string, code?: number): Response` - Redirect
- `sendFile(path: string): Response` - Send file

### Helpers

#### CryptoHelper

```ts
CryptoHelper.sha256(payload: string): Promise<string>
CryptoHelper.sha512(payload: string): Promise<string>
CryptoHelper.secureRandom(): number
```

#### StringHelper

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

**StringHelper.normalizePath**: Normalizes URL paths by joining parts, collapsing multiple slashes, and removing
trailing slashes (except for root). Used internally for route and request path normalization.

#### JsonToken

`JsonToken` provides a simple JWT-like token system for signing and verifying JSON payloads. It uses SHA-256 for
signature generation and Base64URL encoding.

**Format:** `{base64url(payload)}.{signature}`

```ts
class JsonToken {
	constructor(secret: string);
	sign(payload: unknown): Promise<string>;
	verify<T>(token: string): Promise<T | null>;
}
```

**Basic Usage:**

```ts
import { JsonToken } from "jsr:@webtools/expressapi";

// Initialize with a secret key
const token = new JsonToken("your-secret-key");

// Sign a payload
const payload = { userId: 123, email: "user@example.com", role: "admin" };
const signedToken = await token.sign(payload);
// Returns: "eyJ1c2VySWQiOjEyMywiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.signature"

// Verify and decode
const decoded = await token.verify<typeof payload>(signedToken);
// Returns: { userId: 123, email: "user@example.com", role: "admin" }

// Invalid token returns null
const invalid = await token.verify("invalid.token");
// Returns: null
```

**How it works:**

1. **Signing:** The payload is JSON stringified, Base64URL encoded, then concatenated with the secret and hashed with
   SHA-256 to create the signature.
2. **Verification:** The token is split into payload and signature. The payload is re-hashed with the secret and
   compared to the provided signature using constant-time comparison to prevent timing attacks.
3. **Security:** Uses constant-time string comparison to prevent timing attacks. Invalid tokens return `null` instead of
   throwing errors.

**Example: Token-based Authentication**

```ts
import { HttpServer, JsonToken, z } from "jsr:@webtools/expressapi";

const server = new HttpServer(5050);
const token = new JsonToken(Deno.env.get("JWT_SECRET") || "default-secret");

// Issue token
server.post(
	"/auth/login",
	async (req, res) => {
		const { email, password } = req.body;

		// Validate credentials (example)
		const user = await validateUser(email, password);
		if (!user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Create token with user data
		const jwt = await token.sign({
			userId: user.id,
			email: user.email,
			role: user.role,
			iat: Date.now(),
		});

		return res.json({ token: jwt });
	},
	[],
	{
		body: z.object({
			email: z.string().email(),
			password: z.string().min(6),
		}),
	},
);

// Verify token middleware
const verifyToken = async (req, res) => {
	const authHeader = req.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Missing or invalid authorization header" });
	}

	const jwt = authHeader.slice(7);
	const payload = await token.verify<{
		userId: number;
		email: string;
		role: string;
		iat: number;
	}>(jwt);

	if (!payload) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}

	// Attach user data to request
	req.data = {
		userId: payload.userId,
		email: payload.email,
		role: payload.role,
	};
};

// Protected route
server.get("/profile", verifyToken, (req, res) => {
	return res.json({
		userId: req.data.userId,
		email: req.data.email,
		role: req.data.role,
	});
});

server.listen();
```

**Note:** This is a simplified token system. For production use cases requiring expiration, refresh tokens, or advanced
features, consider using a full JWT library.

## 💡 Examples

### REST API Example

```ts
import { HttpServer, z } from "jsr:@webtools/expressapi";

const server = new HttpServer(5050);

// GET /users
server.get("/users", (req, res) => {
	return res.json({ users: [] });
});

// GET /users/:id
server.get("/users/:id", (req, res) => {
	return res.json({ user: { id: req.params.id } });
});

// POST /users
server.post(
	"/users",
	(req, res) => {
		return res.status(201).json({ user: req.body });
	},
	[],
	{
		body: z.object({
			name: z.string().min(3),
			email: z.string().email(),
		}),
	},
);

// PUT /users/:id
server.put("/users/:id", (req, res) => {
	return res.json({ updated: true, id: req.params.id });
});

// DELETE /users/:id
server.delete("/users/:id", (req, res) => {
	return res.status(204).send(null);
});

server.listen();
```

### Authentication Example

```ts
import { HttpServer, JsonToken, z } from "jsr:@webtools/expressapi";

const server = new HttpServer(5050);
const token = new JsonToken("your-secret-key");

// Login
server.post(
	"/login",
	async (req, res) => {
		const { email, password } = req.body;

		// Validate credentials
		if (email === "user@example.com" && password === "password") {
			const jwt = await token.sign({ userId: 123, email });
			return res.json({ token: jwt });
		}

		return res.status(401).json({ error: "Invalid credentials" });
	},
	[],
	{
		body: z.object({
			email: z.string().email(),
			password: z.string().min(6),
		}),
	},
);

// Protected route
const authMiddleware = async (req, res) => {
	const authHeader = req.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const jwt = authHeader.slice(7);
	const payload = await token.verify<{ userId: number }>(jwt);

	if (!payload) {
		return res.status(401).json({ error: "Invalid token" });
	}

	req.data = { userId: payload.userId };
};

server.get("/profile", authMiddleware, (req, res) => {
	return res.json({ userId: req.data.userId });
});

server.listen();
```

### File Upload Example

```ts
server.post("/upload", (req, res) => {
	const formData = req.body;
	const file = formData.file; // File object from FormData

	if (!file) {
		return res.status(400).json({ error: "No file provided" });
	}

	// Process file...
	return res.json({ uploaded: true, filename: file.name });
});
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
