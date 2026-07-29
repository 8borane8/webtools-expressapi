// Simulates a separate client package: ONLY the server type is imported.
//
// `import type` is erased at compile time, so the server module is never
// evaluated: no port is opened, no server code runs.
import type { AppRouter } from "./server.ts";
import { HttpClient } from "../src/mod.ts";

const client = new HttpClient<AppRouter>({
	baseUrl: "http://localhost:3000",
	headers: { authorization: "Bearer demo" },
});

// URLs and types are known without ever touching the server.
//
// `/health` answers two different shapes, so we get their union. No convention
// is imposed: narrow on whatever discriminant suits.
const health = await client.get("/health");
//    ^ { status: string; requestId: string; admin: true }
//    | { success: false; error: string }
if ("status" in health) {
	console.log(`OK (${health.requestId})`, health.admin);
} else {
	console.error(health.error);
}

// `page` is optional in the schema, so it can be omitted here.
const search = await client.get("/search", { query: { q: "alice" } });
//    ^ { term: string; page: string; results: string[] }

// Mounted addRoute: /api prefix + query schema are both in the registry.
const users = await client.get("/api/users", { query: { q: "alice" } });
//    ^ { term: string; page: string; users: { id: string; name: string }[] }

// Params are required and typed even though no params schema is declared.
const user = await client.get("/api/users/:id", { params: { id: "1" } });
//    ^ { id: string; name: string }

const created = await client.post("/api/users", { body: { name: "Charlie" } });
//    ^ { id: string; name: string }

const removed = await client.delete("/api/users/:id", { params: { id: "1" } });
//    ^ { deleted: boolean; id: string; by: string }

console.log({ health, search, users, user, created, removed });
