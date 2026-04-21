import { HttpServer } from "../src/core/server.ts";

const server = new HttpServer();

server.cors({
	allowOrigin: "localhost:5050",
	allowMethods: "GET, OPTIONS",
});

server.get("/", (_req, res) => {
	return res.json({ message: "Hello, World!" });
});

server.listen(5050);
