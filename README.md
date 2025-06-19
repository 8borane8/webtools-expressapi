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

* Minimal and intuitive API inspired by Express.js
* Built-in routing with support for all HTTP methods
* Middleware support
* Typed request and response objects
* Built-in file serving, redirection, and JSON handling
* Simple JWT-like token generation and verification
* Cryptographic helper utilities
* Secure random string generation

## 📦 Installation

```bash
deno add jsr:@webtools/expressapi
```

## 🧠 Usage Example

```ts
import { HttpServer, HttpMethods } from "jsr:@webtools/expressapi";

const server = new HttpServer(3000);

server.get("/hello", (req, res) => {
	return res.status(200).json({ message: "Hello, world!" });
});

server.post("/echo", (req, res) => {
	return res.json({ received: req.body });
});
```

## 🧱 Core Classes

### `HttpServer`

Main entry point to create and start a web server.

#### Usage

```ts
const server = new HttpServer(5050);
server.get("/test", (req, res) => res.json({ success: true }));
```

#### Methods

* `.get(url, handler, middlewares?)`
* `.post(url, handler, middlewares?)`
* `.put(url, handler, middlewares?)`
* `.patch(url, handler, middlewares?)`
* `.delete(url, handler, middlewares?)`
* `.use(middleware)`
* `.setEndpointNotFoundFunction(handler)`

### `HttpRequest`

Encapsulates the incoming HTTP request.

#### Properties

* `.url`: string
* `.method`: `HttpMethods`
* `.headers`: Headers
* `.body`: any (parsed JSON, text, form-data, etc.)
* `.query`: object with URL query parameters
* `.params`: object with URL path parameters
* `.cookies`: parsed cookie values
* `.ip`: client IP if available
* `.raw`: raw `Request` object

### `HttpResponse`

Utility class to build and send responses.

#### Methods

* `.status(code: number)`
* `.setHeader(name, value)`
* `.type(mime: string)` — auto-detects MIME type
* `.json(data: any)` — sets JSON content type
* `.sendFile(path: string)` — serves local file
* `.redirect(url: string, code = 307)`
* `.send(body: BodyInit | null)`

### `HttpMethods`

```ts
enum HttpMethods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE"
}
```

Use this enum for routing and method comparisons.

## 🔐 Token & Security

### `JsonToken`

A lightweight JWT-like utility to sign and verify JSON payloads using SHA-256 and a shared secret.

```ts
const jwt = new JsonToken("my-secret");

const token = await jwt.sign({ userId: 123 });
const data = await jwt.verify(token);

console.log(data); // { userId: 123 }
```

### `CryptoHelper`

Cryptographic utility functions for hashing and randomness.

```ts
await CryptoHelper.sha256("password"); // SHA-256 hash
CryptoHelper.secureRandom(); // returns a cryptographically secure random float between 0 and 1
```

Available methods:

* `.md5(payload)`
* `.sha256(payload)`
* `.sha512(payload)`
* `.secureRandom()`

## 🔤 String Utilities

### `StringHelper`

Random string generator based on pattern.

```ts
const key = StringHelper.generateRandomString("XXXX-XXXX", "ABC123");
console.log(key); // e.g., "1AC2-B3CA"
```

## 📚 API Overview

### `interface Route`

```ts
interface Route {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener[];
	requestListener: RequestListener;
}
```

### `type RequestListener`

```ts
type RequestListener = (
	req: HttpRequest,
	res: HttpResponse
) => Response | Promise<Response | void> | void;
```

## ✅ Built-in Middleware Support

You can register global or per-route middleware:

```ts
server.use(async (req, res) => {
	console.log(`[${req.method}] ${req.url}`);
});

server.get("/secure", async (req, res) => {
	if (!req.headers.get("authorization")) {
		return res.status(401).json({ error: "Unauthorized" });
	}
});
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
