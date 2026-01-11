<h1 align="center">Welcome on ExpressAPI !</h1>

<p align="center">
    <em>
        ExpressAPI is a small, simple, and ultrafast library for building web APIs, built on Web Standards for Deno.
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

- Minimal and intuitive API inspired by Express.js
- Built-in routing with support for all HTTP methods
- Built-in file serving, redirection, and JSON handling
- Request body validation with schema system
- Middleware support (global and per-route)
- Typed request and response objects
- Type-safe generic data context
- Simple JWT-like token generation and verification
- Secure random string generation
- Cryptographic helper utilities

## 📦 Installation

```bash
deno add jsr:@webtools/expressapi
```

## 🧠 Quick Start

```ts
import { HttpServer } from "jsr:@webtools/expressapi";

const server = new HttpServer(5050);

server.get("/hello", (req, res) => {
	return res.status(200).json({ message: "Hello, world!" });
});

server.post("/echo", (req, res) => {
	return res.json({ received: req.body });
});
```

## 🧱 Core Classes

### `HttpServer<TData>`

Main entry point to create and start a web server. Supports generic type `TData` for type-safe request context.

#### Constructor

```ts
new HttpServer<TData = any>(port?: number)
```

- `port` (optional): Port number to listen on. Defaults to `5050`.
- `TData` (optional): Generic type for `req.data` property. Defaults to `any`.

#### Example with Typed Data

```ts
interface UserData {
	userId: number;
	username: string;
}

const server = new HttpServer<UserData>(5050);

server.use(async (req, res) => {
	// req.data is typed as UserData
	req.data.userId = 123;
	req.data.username = "john";
});
```

#### Methods

##### `.get<T>(url, requestListener, middlewares?)`

Register a GET route.

- `url`: Route pattern (supports `:param` for path parameters)
- `requestListener`: Handler function `(req, res) => Response | Promise<Response | void> | void`
- `middlewares` (optional): Array of middleware functions

```ts
server.get("/users/:id", (req, res) => {
	const userId = req.params.id; // string
	return res.json({ userId });
});
```

##### `.post<T>(url, requestListener, middlewares?, schema?)`

Register a POST route with optional body validation.

```ts
const createUserSchema = z.object({
	name: z.string("Name is required").min(3),
	email: z.string().email(),
	age: z.number().min(18),
});

server.post(
	"/users",
	async (req, res) => {
		// req.body is typed and validated
		return res.json({ created: req.body });
	},
	[],
	createUserSchema,
);
```

##### `.put<T>(url, requestListener, middlewares?, schema?)`

Register a PUT route.

##### `.patch<T>(url, requestListener, middlewares?, schema?)`

Register a PATCH route.

##### `.delete<T>(url, requestListener, middlewares?, schema?)`

Register a DELETE route.

##### `.use(middleware)`

Register a global middleware that runs before all routes.

```ts
server.use(async (req, res) => {
	console.log(`[${req.method}] ${req.url}`);
	// Return nothing to continue
});

server.use(async (req, res) => {
	if (!req.headers.get("authorization")) {
		return res.status(401).json({ error: "Unauthorized" });
	}
});
```

##### `.notFound(handler)`

Set a custom handler for 404 responses.

```ts
server.notFound((req, res) => {
	return res.status(404).json({
		error: "Route not found",
		path: req.url,
	});
});
```

### `HttpRequest<TBody, TData>`

Encapsulates the incoming HTTP request with typed body and data context.

#### Properties

##### `.url: string`

The request URL pathname (without query string).

```ts
// GET /users/123?page=1
req.url; // "/users/123"
```

##### `.method: HttpMethods`

The HTTP method (GET, POST, PUT, PATCH, DELETE).

```ts
if (req.method === HttpMethods.POST) {
	// Handle POST request
}
```

##### `.headers: Headers`

Standard Web API `Headers` object.

```ts
const auth = req.headers.get("authorization");
const contentType = req.headers.get("content-type");
```

##### `.body: TBody`

Parsed request body. Automatically parsed based on `Content-Type`:

- `application/json` → JSON object
- `multipart/form-data` → FormData as object
- `application/x-www-form-urlencoded` → URL-encoded as object
- Otherwise → string

```ts
// With schema validation
server.post("/users", async (req, res) => {
	// req.body is typed according to schema
	console.log(req.body.name); // string
});
```

##### `.query: Record<string, string>`

URL query parameters as key-value pairs.

```ts
// GET /search?q=hello&page=2
req.query.q; // "hello"
req.query.page; // "2"
```

##### `.params: Record<string, string>`

Route path parameters extracted from URL pattern.

```ts
// Route: /users/:id/posts/:postId
// Request: /users/123/posts/456
req.params.id; // "123"
req.params.postId; // "456"
```

##### `.cookies: Record<string, string>`

Parsed cookies from `Cookie` header.

```ts
// Cookie: sessionId=abc123; theme=dark
req.cookies.sessionId; // "abc123"
req.cookies.theme; // "dark"
```

##### `.ip: string | null`

Client IP address extracted from `X-Forwarded-For` header, or `null` if not available.

```ts
const clientIp = req.ip; // "192.168.1.1" or null
```

##### `.data: TData`

Generic data context. Typed when using `HttpServer<TData>`.

```ts
interface AppData {
	user?: { id: number; name: string };
}

const server = new HttpServer<AppData>(5050);

server.use(async (req, res) => {
	req.data.user = { id: 1, name: "John" };
});

server.get("/profile", (req, res) => {
	// req.data.user is typed as { id: number; name: string } | undefined
	return res.json(req.data.user);
});
```

##### `.raw: Request`

Raw Web API `Request` object for advanced use cases.

```ts
const stream = req.raw.body; // ReadableStream
```

### `HttpResponse`

Utility class to build and send HTTP responses.

#### Methods

##### `.status(code: number): HttpResponse`

Set the HTTP status code.

```ts
res.status(201).json({ id: 1 });
```

##### `.setHeader(name: string, value: string): HttpResponse`

Set a custom response header.

```ts
res.setHeader("X-Custom-Header", "value");
```

##### `.type(type: string): HttpResponse`

Set `Content-Type` header based on file extension or MIME type.

```ts
res.type("json").send('{"key": "value"}');
res.type("html").send("<h1>Hello</h1>");
```

##### `.size(size: number): HttpResponse`

Set `Content-Length` header.

```ts
res.size(1024).send(data);
```

##### `.json<T>(body: T): Response`

Send JSON response with `Content-Type: application/json`.

```ts
res.json({ success: true, data: { id: 1 } });
```

##### `.send(body: BodyInit | null): Response`

Send raw response body.

```ts
res.send("Hello World");
res.send(new Blob([data]));
res.send(null); // Empty body
```

##### `.redirect(url: string, code?: number): Response`

Send redirect response. Default status code is `307`.

```ts
res.redirect("/login", 301); // Permanent redirect
res.redirect("/dashboard"); // Temporary redirect (307)
```

##### `.sendFile(path: string): Response`

Serve a local file. Automatically sets `Content-Type` and `Content-Length`.

```ts
res.sendFile("./public/index.html");
```

### `Router<TData>`

Router class for organizing routes. Can be mounted on `HttpServer` with or without a prefix.

#### Constructor

```ts
new Router<TData = any>()
```

- `TData` (optional): Generic type for `req.data` property. Defaults to `any`.

#### Methods

All HTTP methods are available: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`

##### `.use(middleware)`

Register a middleware for all routes in this router.

```ts
const router = new Router();
router.use((req, res) => {
	console.log("Router middleware");
});
```

##### `.use(prefix, router)`

Mount a router with a prefix.

```ts
const apiRouter = new Router();
apiRouter.get("/status", (req, res) => {
	return res.json({ status: "ok" });
});

server.use("/api", apiRouter);
// Route becomes: /api/status
```

##### `.use(router)`

Mount a router without a prefix.

```ts
const adminRouter = new Router();
adminRouter.get("/dashboard", (req, res) => {
	return res.json({ dashboard: true });
});

server.use(adminRouter);
// Route becomes: /dashboard
```

##### `.addRoute(route)`

Add a route object directly.

```ts
router.addRoute({
	url: "/custom",
	method: HttpMethods.PUT,
	middlewares: [],
	requestListener: handler,
	schema: mySchema,
});
```

##### `.addRoutes(routes)`

Add multiple routes at once.

```ts
router.addRoutes([route1, route2, route3]);
```

### `HttpMethods`

Enumeration of supported HTTP methods.

```ts
enum HttpMethods {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}
```

## 📋 Schema Validation

ExpressAPI includes a powerful schema validation system similar to Zod, accessible via the `z` export.

### Basic Usage

```ts
import { z } from "jsr:@webtools/expressapi";

const schema = z.object({
	name: z.string().min(3),
	email: z.string().email(),
	age: z.number().int().min(18),
});

server.post(
	"/users",
	async (req, res) => {
		// req.body is validated and typed
		return res.json({ user: req.body });
	},
	[],
	schema,
);
```

### Primitive Schemas

#### `z.string(message?)`

Validates and converts input to string.

```ts
z.string(); // Accepts any value, converts to string
z.string("Name is required"); // Custom error message
```

**Methods:**

- `.min(length, message?)`: Minimum length
  ```ts
  z.string().min(3, "At least 3 characters");
  ```

- `.max(length, message?)`: Maximum length
  ```ts
  z.string().max(100, "Maximum 100 characters");
  ```

- `.regex(pattern, message?)`: Regular expression validation (can be called multiple times)

```ts
z.string().regex(/^[A-Z]/, "Must start with uppercase")
	.regex(/\d/, "Must contain a digit");
```

- `.email(message?)`: Email format validation
  ```ts
  z.string().email("Invalid email format");
  ```

- `.url(message?)`: URL format validation
  ```ts
  z.string().url("Invalid URL format");
  ```

**Example:**

```ts
const schema = z.string("Name is required")
	.min(3, "Too short")
	.max(50, "Too long")
	.email("Invalid email format");
```

#### `z.number(message?)`

Validates and converts input to number. Accepts string numbers and converts them.

```ts
z.number(); // Accepts "123" or 123 → 123
z.number("Must be a number"); // Custom error message
```

**Methods:**

- `.min(value, message?)`: Minimum value
  ```ts
  z.number().min(0, "Must be positive or zero");
  ```

- `.max(value, message?)`: Maximum value
  ```ts
  z.number().max(100, "Maximum 100");
  ```

- `.int(message?)`: Must be an integer (no decimals)
  ```ts
  z.number().int("Must be an integer");
  ```

- `.positive(message?)`: Must be greater than 0
  ```ts
  z.number().positive("Must be positive");
  ```

- `.negative(message?)`: Must be less than 0
  ```ts
  z.number().negative("Must be negative");
  ```

**Example:**

```ts
const schema = z.number("Age is required")
	.int("Must be an integer")
	.min(18, "Must be 18 or older")
	.max(120, "Invalid age");
```

#### `z.boolean(message?)`

Validates and converts input to boolean. Accepts:

- `"true"`, `"1"` → `true`
- `"false"`, `"0"` → `false`

```ts
z.boolean(); // Accepts "true", "false", "1", "0", true, false
z.boolean("Must be a boolean");
```

**Example:**

```ts
const schema = z.boolean("Must be true or false");
```

#### `z.any()`

Accepts any value without validation.

```ts
z.any(); // Accepts anything
```

### Composite Schemas

#### `z.object(shape, message?)`

Validates an object with a specific shape.

```ts
const schema = z.object({
	name: z.string(),
	age: z.number(),
}, "Must be an object");
```

**Example:**

```ts
const userSchema = z.object({
	name: z.string("Name is required").min(3),
	email: z.string().email("Invalid email"),
	age: z.number("Age is required").int().min(18),
	active: z.boolean(),
});
```

#### `z.array(itemSchema, message?)`

Validates an array where each item matches the schema.

```ts
const schema = z.array(z.string(), "Must be an array");
```

**Methods:**

- `.min(length, message?)`: Minimum array length
  ```ts
  z.array(z.string()).min(1, "At least one item");
  ```

- `.max(length, message?)`: Maximum array length
  ```ts
  z.array(z.string()).max(10, "Maximum 10 items");
  ```

**Example:**

```ts
const schema = z.array(z.string("Each item must be a string"))
	.min(1, "At least one item")
	.max(100, "Maximum 100 items");
```

#### `z.optional(schema)`

Makes a field optional (undefined if not provided).

```ts
const schema = z.object({
	name: z.string(),
	email: z.optional(z.string().email()), // email is optional
});
```

**Example:**

```ts
const schema = z.object({
	name: z.string(),
	nickname: z.optional(z.string()), // Can be undefined
});
```

#### `z.nullable(schema)`

Allows null values. For boolean schemas, `false` and `"false"` are converted to `null`.

```ts
const schema = z.object({
	description: z.nullable(z.string()), // Can be null
	active: z.nullable(z.boolean()), // false or "false" → null
});
```

**Example:**

```ts
const schema = z.nullable(z.string());
schema.parse(null); // null
schema.parse("false"); // null (if boolean schema)
schema.parse(""); // null (if boolean schema)
```

#### `z.union(...schemas, message?)`

Validates that the value matches at least one of the provided schemas.

```ts
const schema = z.union(
	z.string(),
	z.number(),
	"Must be a string or number",
);
```

**Example:**

```ts
const idSchema = z.union(
	z.string(),
	z.number(),
	"ID must be a string or number",
);

// Accepts "123" or 123
```

#### `z.enum(values, message?)`

Validates that the value is one of the provided string values.

```ts
const schema = z.enum(
	["admin", "user", "guest"],
	"Invalid role",
);
```

**Example:**

```ts
const roleSchema = z.enum(
	["admin", "user", "moderator"],
	"Role must be admin, user, or moderator",
);
```

### Schema Methods

#### `.parse(data): T`

Parse and validate data. Throws `ValidationError` on failure.

```ts
try {
	const result = schema.parse(req.body);
} catch (error) {
	if (error instanceof ValidationError) {
		console.log(error.issues);
	}
}
```

#### `.safeParse(data): ValidationResult<T>`

Parse and validate data without throwing. Returns `{ success: true, data: T }` or
`{ success: false, error: ValidationError }`.

```ts
const result = schema.safeParse(req.body);
if (result.success) {
	console.log(result.data);
} else {
	console.log(result.error.issues);
}
```

### Error Handling

Validation errors contain detailed information:

```ts
{
	success: false,
	error: "400 Bad Request.",
	issues: [
		{
			path: ["name"], // Field path
			message: "String must be at least 3 characters",
			code: "too_small"
		},
		{
			path: ["email"],
			message: "Invalid email format",
			code: "invalid_string"
		}
	]
}
```

### Custom Error Messages

You can provide custom error messages at multiple levels:

1. **Schema-level default message:**
   ```ts
   z.string("Name is required");
   ```

2. **Method-level message (overrides default):**
   ```ts
   z.string("Name is required")
   	.min(3, "Too short"); // Overrides default
   ```

3. **Built-in defaults:** If no message is provided, sensible defaults are used.

### Complete Example

```ts
import { HttpServer, z } from "jsr:@webtools/expressapi";

const server = new HttpServer(5050);

const createUserSchema = z.object({
	name: z.string("Name is required")
		.min(3, "Name must contain at least 3 characters")
		.max(50, "Name cannot exceed 50 characters"),
	email: z.string("Email is required")
		.email("Invalid email format"),
	age: z.number("Age is required")
		.int("Age must be an integer")
		.min(18, "Must be 18 or older")
		.max(120, "Invalid age"),
	role: z.enum(["user", "admin"], "Invalid role"),
	tags: z.array(z.string())
		.min(1, "At least one tag required")
		.max(10, "Maximum 10 tags"),
	active: z.boolean(),
	bio: z.optional(z.string().max(500)),
});

server.post(
	"/users",
	async (req, res) => {
		// req.body is fully typed and validated
		const { name, email, age, role, tags, active, bio } = req.body;

		return res.status(201).json({
			success: true,
			user: { name, email, age, role, tags, active, bio },
		});
	},
	[],
	createUserSchema,
);
```

## 🔐 Token & Security

### `JsonToken`

A lightweight JWT-like utility to sign and verify JSON payloads using SHA-256 and a shared secret.

#### Constructor

```ts
new JsonToken(secret: string)
```

- `secret`: Secret key used for signing and verification

#### Methods

##### `.sign<T>(jsonPayload: T): Promise<string>`

Sign a JSON payload and return a token.

```ts
const jwt = new JsonToken("my-secret-key");

const token = await jwt.sign({ userId: 123, username: "john" });
// Returns: "base64EncodedPayload.signature"
```

##### `.verify<T>(token: string): Promise<T | null>`

Verify and decode a token. Returns `null` if invalid.

```ts
const jwt = new JsonToken("my-secret-key");

const data = await jwt.verify(token);
if (data) {
	console.log(data.userId); // 123
	console.log(data.username); // "john"
} else {
	console.log("Invalid token");
}
```

#### Complete Example

```ts
import { JsonToken } from "jsr:@webtools/expressapi";

const jwt = new JsonToken(Deno.env.get("JWT_SECRET") || "default-secret");

// Sign
const token = await jwt.sign({ userId: 123, role: "admin" });

// Verify
const payload = await jwt.verify(token);
if (payload) {
	console.log(payload.userId, payload.role);
}
```

### `CryptoHelper`

Cryptographic utility functions for hashing and randomness.

#### Methods

##### `.hash(payload: string, algorithm: DigestAlgorithm): Promise<string>`

Generic hash function supporting multiple algorithms.

- `payload`: String to hash
- `algorithm`: `"SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"`

```ts
const hash = await CryptoHelper.hash("password123", "SHA-256");
```

##### `.sha256(payload: string): Promise<string>`

SHA-256 hash (most common).

```ts
const hash = await CryptoHelper.sha256("password123");
// Returns: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94"
```

##### `.sha512(payload: string): Promise<string>`

SHA-512 hash.

```ts
const hash = await CryptoHelper.sha512("password123");
```

##### `.secureRandom(): number`

Returns a cryptographically secure random float between 0 and 1.

```ts
const random = CryptoHelper.secureRandom(); // 0.0 to 1.0
```

#### Complete Example

```ts
import { CryptoHelper } from "jsr:@webtools/expressapi";

// Hash passwords
const passwordHash = await CryptoHelper.sha256("user-password");

// Generate secure random
const randomValue = CryptoHelper.secureRandom();
```

## 🔤 String Utilities

### `StringHelper`

Collection of string manipulation utilities.

#### Methods

##### `.generateRandomString(pattern?, chars?): string`

Generate a random string based on a pattern.

- `pattern` (optional): Pattern where `X` is replaced by random chars. Default: `"XXXX-XXXX-XXXX-XXXX"`
- `chars` (optional): Character set to use. Default: `"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"`

```ts
StringHelper.generateRandomString();
// "A3B2-C4D1-E5F6-G7H8"

StringHelper.generateRandomString("XXXX-XXXX", "0123456789");
// "1234-5678"

StringHelper.generateRandomString("XXX-XXX-XXX", "ABC");
// "ABC-CBA-ABC"
```

##### `.encodeBase64Url(data: string): string`

Encode string to Base64URL (URL-safe Base64).

```ts
const encoded = StringHelper.encodeBase64Url("Hello World");
// "SGVsbG8gV29ybGQ"
```

##### `.decodeBase64Url(data: string): string`

Decode Base64URL string.

```ts
const decoded = StringHelper.decodeBase64Url("SGVsbG8gV29ybGQ");
// "Hello World"
```

##### `.slugify(str: string): string`

Convert string to URL-friendly slug.

```ts
StringHelper.slugify("Hello World!");
// "hello-world"

StringHelper.slugify("Café & Restaurant");
// "cafe-restaurant"
```

##### `.capitalize(str: string): string`

Capitalize first letter, lowercase the rest.

```ts
StringHelper.capitalize("hello WORLD");
// "Hello world"
```

##### `.toPascalCase(str: string): string`

Convert string to PascalCase.

```ts
StringHelper.toPascalCase("hello world");
// "HelloWorld"

StringHelper.toPascalCase("user name");
// "UserName"
```

##### `.escapeHtml(str: string): string`

Escape HTML special characters.

```ts
StringHelper.escapeHtml("<script>alert('xss')</script>");
// "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
```

##### `.unescapeHtml(str: string): string`

Unescape HTML entities.

```ts
StringHelper.unescapeHtml("&lt;div&gt;");
// "<div>"
```

##### `.clean(str: string): string`

Remove extra whitespace and trim.

```ts
StringHelper.clean("  hello    world  ");
// "hello world"
```

#### Complete Example

```ts
import { StringHelper } from "jsr:@webtools/expressapi";

// Generate IDs
const sessionId = StringHelper.generateRandomString("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX");

// URL slugs
const slug = StringHelper.slugify("My Awesome Article!");
// "my-awesome-article"

// HTML safety
const safe = StringHelper.escapeHtml(userInput);
```

## ✅ Middleware & Validation

### Global Middleware

Register middleware that runs before all routes:

```ts
server.use(async (req, res) => {
	console.log(`${req.method} ${req.url}`);
	// Continue to next middleware/route
});

server.use(async (req, res) => {
	const token = req.headers.get("authorization");
	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	// If no return, continues to next middleware
});
```

### Route-Specific Middleware

Add middleware to specific routes:

```ts
const authMiddleware = async (req, res) => {
	const token = req.headers.get("authorization");
	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}
};

server.get("/protected", async (req, res) => {
	return res.json({ message: "Protected content" });
}, [authMiddleware]);
```

### Body Validation Middleware

Use `validateBody` function or pass schema directly to route methods:

```ts
import { validateBody, z } from "jsr:@webtools/expressapi";

const schema = z.object({
	name: z.string().min(3),
});

// Method 1: Pass schema to route method
server.post("/users", handler, [], schema);

// Method 2: Use validateBody manually
const validateMiddleware = validateBody(schema);
server.post("/users", handler, [validateMiddleware]);
```

### Middleware Execution Order

1. Global middlewares (registered with `.use()`)
2. Route-specific middlewares
3. Route handler

If any middleware returns a `Response`, execution stops and that response is sent.

## 📚 Types & Interfaces

### `RequestListener<TBody, TData>`

Type for request handlers and middlewares.

```ts
type RequestListener<TBody = any, TData = any> = (
	req: HttpRequest<TBody, TData>,
	res: HttpResponse,
) => Promise<Response | void> | Response | void;
```

### `Route<TBody, TData>`

Route interface.

```ts
interface Route<TBody = any, TData = any> {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener<TBody, TData>[];
	requestListener: RequestListener<TBody, TData>;
	schema?: Schema<TBody>;
}
```

### `Schema<T>`

Base interface for all schemas.

```ts
interface Schema<T = unknown> {
	parse(data: unknown): T;
	safeParse(data: unknown): ValidationResult<T>;
}
```

### `ValidationResult<T>`

Result type for `safeParse`.

```ts
type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; error: ValidationError };
```

### `ValidationError`

Error class thrown by schema validation.

```ts
class ValidationError extends Error {
	issues: Array<{
		path: (string | number)[];
		message: string;
		code: string;
	}>;
}
```

## 🎯 Complete Example

```ts
import { CryptoHelper, HttpServer, JsonToken, z } from "jsr:@webtools/expressapi";

interface AppData {
	user?: { id: number; name: string };
}

const server = new HttpServer<AppData>(5050);
const jwt = new JsonToken("my-secret");

// Global middleware
server.use(async (req, res) => {
	console.log(`[${req.method}] ${req.url}`);
});

// Auth middleware
const authMiddleware = async (req, res) => {
	const token = req.headers.get("authorization");
	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const payload = await jwt.verify<{ userId: number }>(token);
	if (!payload) {
		return res.status(401).json({ error: "Invalid token" });
	}

	req.data.user = { id: payload.userId, name: "John" };
};

// Schemas
const loginSchema = z.object({
	email: z.string("Email is required").email("Invalid email"),
	password: z.string("Password is required").min(8),
});

const createPostSchema = z.object({
	title: z.string("Title is required").min(3).max(100),
	content: z.string("Content is required").min(10),
	tags: z.array(z.string()).min(1).max(5),
	published: z.boolean(),
});

// Routes
server.post(
	"/login",
	async (req, res) => {
		const { email, password } = req.body;

		const passwordHash = await CryptoHelper.sha256(password);
		// Verify password...

		const token = await jwt.sign({ userId: 123 });
		return res.json({ token });
	},
	[],
	loginSchema,
);

server.get("/posts/:id", async (req, res) => {
	const postId = req.params.id;
	// Fetch post...
	return res.json({ id: postId, title: "Post" });
});

server.post(
	"/posts",
	async (req, res) => {
		// req.body is validated
		// req.data.user is typed
		return res.status(201).json({
			post: req.body,
			author: req.data.user,
		});
	},
	[authMiddleware],
	createPostSchema,
);

server.get("/profile", async (req, res) => {
	return res.json({ user: req.data.user });
}, [authMiddleware]);

server.notFound((req, res) => {
	return res.status(404).json({
		error: "Not Found",
		path: req.url,
	});
});
```

```
## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
```
