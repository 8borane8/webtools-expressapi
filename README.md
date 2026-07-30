<h1 align="center">ExpressAPI</h1>

<p align="center">
  <img src="https://img.shields.io/github/license/8borane8/webtools-expressapi.svg" alt="license" />
  &nbsp;
  <img src="https://img.shields.io/github/stars/8borane8/webtools-expressapi.svg" alt="stars" />
  &nbsp;
  <img src="https://img.shields.io/github/issues-closed/8borane8/webtools-expressapi.svg" alt="issues-closed" />
  &nbsp;
  <img src="https://img.shields.io/github/forks/8borane8/webtools-expressapi.svg" alt="forks" />
</p>

ExpressAPI is a small, simple, and type-safe web framework for Deno, built on Web Standards. Clean abstractions, elegant
APIs, and almost no dependencies.

Typed end to end, not only on the server.

```ts
import { HttpServer } from "jsr:@webtools/expressapi";

export const server = new HttpServer()
	.get("/", (_req, res) => res.json({ message: "Hello!" }))
	.get("/users/:id", (req, res) => res.json({ id: req.params.id }));

export type AppRouter = typeof server;

server.listen(5050);
```

```ts
import type { AppRouter } from "./server.ts";
import { HttpClient } from "jsr:@webtools/expressapi";

const client = new HttpClient<AppRouter>({ baseUrl: "http://localhost:5050" });
const user = await client.get("/users/:id", { params: { id: "42" } });
//    ^ { id: string }
```

## Quick Start

```bash
deno add jsr:@webtools/expressapi
```

## Features

- **End-to-end types** - Export `typeof server`, get a fully typed `HttpClient`. No codegen, no contract file.
- **Clean abstractions** - `HttpServer`, `Router`, `Middleware`, `HttpClient`. Each has one job.
- **Elegant APIs** - Express-shaped, chainable, and familiar. Params inferred from the URL string.
- **Typed middleware** - Context accumulates in `req.data`. Wrong order fails at compile time.
- **Built-in validation** - Schemas narrow `body`, `query`, and `params` with no extra package.
- **Few dependencies** - Small surface, easy to audit, built on native Deno Web APIs.

## Documentation

The documentation is available on
[expressapi-showcase.8borane8.deno.net](https://expressapi-showcase.8borane8.deno.net/).

## License

Distributed under the MIT License. See [LICENCE](LICENCE) for more information.
