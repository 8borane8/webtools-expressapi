// Same-process demo: start the server and query it.
//
// For the separate client package case, see test/client.ts, which relies on an
// `import type` only and therefore never runs any server code.
import { HttpClient, HttpClientError } from "../src/mod.ts";
import { server } from "./server.ts";

const running = Deno.serve({ port: 3000, onListen: () => {} }, server.fetch);

const client = new HttpClient<typeof server>({
	baseUrl: "http://localhost:3000",
	headers: { authorization: "Bearer demo" },
});

const results = {
	health: await client.get("/health"),
	search: await client.get("/search", { query: { q: "alice" } }),
	users: await client.get("/api/users", { query: { q: "alice" } }),
	user: await client.get("/api/users/:id", { params: { id: "42" } }),
	created: await client.post("/api/users", { body: { name: "Charlie" } }),
	removed: await client.delete("/api/users/:id", { params: { id: "42" } }),
};

console.log(JSON.stringify(results, null, 2));

// Without an auth header the middleware answers 401: the client throws instead
// of returning an error body disguised as a valid response.
const anonymous = new HttpClient<typeof server>({ baseUrl: "http://localhost:3000" });
try {
	await anonymous.get("/health");
	console.error("An error was expected.");
} catch (error) {
	if (!(error instanceof HttpClientError)) throw error;
	console.log(`\nHttpClientError ${error.status}:`, error.body);
}

// Validation also fails cleanly: `q` is required.
try {
	// @ts-expect-error required query deliberately omitted to exercise the 400
	await client.get("/search", {});
	console.error("An error was expected.");
} catch (error) {
	if (!(error instanceof HttpClientError)) throw error;
	console.log(`HttpClientError ${error.status}:`, error.body);
}

await running.shutdown();
