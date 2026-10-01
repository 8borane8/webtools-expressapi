import { assertEquals, assertThrows } from "@std/assert";
import { JsonToken, z } from "@/mod.ts";

Deno.test("signs and verifies, including non latin-1 payloads", async () => {
	const jwt = new JsonToken("secret");
	const payload = { name: "Zo\u00e9 \u20ac \u{1F600}", id: 1 };

	assertEquals(await jwt.verify(await jwt.sign(payload)), payload);
});

Deno.test("rejects tampered, foreign and malformed tokens", async () => {
	const jwt = new JsonToken("secret");
	const token = await jwt.sign({ id: 1 });
	const [payload, signature] = token.split(".");

	assertEquals(await new JsonToken("other").verify(token), null);
	assertEquals(await jwt.verify(`${btoa('{"id":2}')}.${signature}`), null);
	assertEquals(await jwt.verify(`${payload}.${signature}.extra`), null);
	assertEquals(await jwt.verify(payload), null);
	assertEquals(await jwt.verify("not a token"), null);
	assertEquals(await jwt.verify(""), null);
});

Deno.test("validates the payload with a schema", async () => {
	const jwt = new JsonToken("secret");
	const token = await jwt.sign({ id: "1" });

	assertEquals(await jwt.verify(token, z.object({ id: z.string() })), { id: "1" });
	assertEquals(await jwt.verify(token, z.object({ id: z.literal(2) })), null);
});

Deno.test("requires a secret", () => {
	assertThrows(() => new JsonToken(""), Error, "non-empty secret");
});
