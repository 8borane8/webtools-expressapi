/**
 * ExpressAPI: a small, type-safe web framework for Deno. Export `typeof server` and get a fully typed `HttpClient`,
 * with built-in validation (`z`) and typed middlewares.
 *
 * @example
 * ```ts
 * import { HttpClient, HttpServer } from "jsr:@webtools/expressapi";
 *
 * const server = new HttpServer()
 * 	.get("/users/:id", (req, res) => res.json({ id: req.params.id }));
 *
 * server.listen(5050);
 *
 * const client = new HttpClient<typeof server>({ baseUrl: "http://localhost:5050" });
 * const user = await client.get("/users/:id", { params: { id: "42" } }); // { id: string }
 * ```
 *
 * @module
 */

export { HttpClient, HttpClientError, type HttpClientOptions } from "./core/client.ts";
export { HttpServer, type HttpServerOptions } from "./core/server.ts";

export type { ErrorListener, RequestListener } from "./routing/listener.ts";
export { type Middleware, middleware } from "./routing/middleware.ts";
export type { CorsAllow, CorsRules } from "./routing/cors.ts";
export { Router } from "./routing/router.ts";

export type { HttpResponse, TypedResponse } from "./http/response.ts";
export type { HttpRequest } from "./http/request.ts";
export type { Schemas } from "./http/context.ts";
export { HttpMethods } from "./http/methods.ts";

export { type InferSchemaType, type Schema, ValidationError, type ValidationResult } from "./validation/base.ts";
export { z } from "./validation/schema.ts";

/** Hashing and secure random helpers: `sha256`, `sha512`, `secureRandom`. */
export * as CryptoHelper from "./utils/crypto.ts";
/** String helpers: `generateRandomString`, `escapeHtml`, `unescapeHtml`, `slugify`, `clean`. */
export * as StringHelper from "./utils/string.ts";
export { JsonToken } from "./utils/json-token.ts";
