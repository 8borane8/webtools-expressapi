import { assert, assertEquals } from "@std/assert";
import { z } from "@/mod.ts";
import { rejects } from "../helpers.ts";

Deno.test("string only accepts strings", () => {
	assertEquals(z.string().parse("a"), "a");
	rejects(z.string(), [123, { a: 1 }, ["x"], null, undefined, true]);
});

Deno.test("string checks", () => {
	assertEquals(z.string().min(2).max(3).parse("abc"), "abc");
	rejects(z.string().min(2), ["a"]);
	rejects(z.string().max(2), ["abc"]);
	rejects(z.string().length(2), ["a", "abc"]);
	rejects(z.string().startsWith("a"), ["ba"]);
	rejects(z.string().endsWith("a"), ["ab"]);
	rejects(z.string().regex(/^\d+$/), ["a1"]);
	rejects(z.string().email(), ["nope", "a@b"]);
	rejects(z.string().uuid(), ["123"]);
	rejects(z.string().url(), ["example.com", "http://"]);
	z.string().email().parse("a@b.co");
	z.string().uuid().parse(crypto.randomUUID());
	z.string().url().parse("https://example.com/path");
});

Deno.test("custom message replaces the defaults", () => {
	const result = z.string("Nope").min(5).safeParse("a");
	assert(!result.success);
	assertEquals(result.error.issues[0].message, "Nope");
	assertEquals(z.string().min(5, "Too short").safeParse("a").success, false);
});

Deno.test("schemas are immutable", () => {
	const base = z.string();
	const short = base.max(3);

	assertEquals(base.parse("abcdef"), "abcdef");
	rejects(short, ["abcdef"]);
});

Deno.test("number accepts numbers and numeric strings only", () => {
	assertEquals(z.number().parse(5), 5);
	assertEquals(z.number().parse("5"), 5);
	assertEquals(z.number().parse("-1.5"), -1.5);
	assertEquals(z.number().parse("1e3"), 1000);
	rejects(z.number(), [true, [], [5], "Infinity", "0x10", "", " ", "abc", NaN, Infinity, null, undefined, {}]);
});

Deno.test("number checks", () => {
	rejects(z.number().int(), [1.5]);
	rejects(z.number().min(2), [1]);
	rejects(z.number().max(2), [3]);
	rejects(z.number().positive(), [0, -1]);
	rejects(z.number().negative(), [0, 1]);
	assertEquals(z.number().int().min(1).max(3).parse("2"), 2);
});

Deno.test("boolean", () => {
	for (const value of [true, "true", "1", 1, "on"]) assertEquals(z.boolean().parse(value), true);
	for (const value of [false, "false", "0", 0, "off"]) assertEquals(z.boolean().parse(value), false);
	rejects(z.boolean(), ["yes", [], {}, null, undefined, 2]);
});

Deno.test("literal", () => {
	const admin: "admin" = z.literal("admin").parse("admin");
	assertEquals(admin, "admin");
	assertEquals(z.literal(5).parse(5), 5);
	assertEquals(z.literal(5).parse("5"), 5);
	assertEquals(z.literal(true).parse("true"), true);
	assertEquals(z.literal(false).parse(false), false);
	assertEquals(z.literal(null).parse(null), null);

	rejects(z.literal("5"), [5, "6"]);
	rejects(z.literal(5), [6, "6", "", true, []]);
	rejects(z.literal(true), [false, "false", 1]);
	rejects(z.literal(null), [undefined, "null"]);

	const result = z.literal("5").safeParse("6");
	assert(!result.success);
	assertEquals(result.error.issues[0], { path: [], message: 'Expected "5", got "6"', code: "invalid_literal" });
});

Deno.test("file", () => {
	const file = new File(["abc"], "a.txt", { type: "text/plain" });

	assertEquals(z.file().parse(file), file);
	assertEquals(z.file().maxSize(3).type(["text/"]).parse(file), file);
	rejects(z.file().maxSize(2), [file]);
	rejects(z.file().minSize(4), [file]);
	rejects(z.file().type(["image/", "application/pdf"]), [file]);
	rejects(z.file(), ["abc", null]);
});

Deno.test("any accepts everything", () => {
	assertEquals(z.any().parse(undefined), undefined);
	assertEquals(z.any().parse({ a: 1 }), { a: 1 });
});
