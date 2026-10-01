import { assert, assertEquals } from "@std/assert";
import { type InferSchemaType, z } from "@/mod.ts";
import { rejects } from "../helpers.ts";

Deno.test("optional and nullable", () => {
	assertEquals(z.optional(z.string()).parse(undefined), undefined);
	assertEquals(z.optional(z.string()).parse("a"), "a");

	assertEquals(z.nullable(z.string()).parse(null), null);
	assertEquals(z.nullable(z.number()).parse(0), 0);
	assertEquals(z.nullable(z.string()).parse(""), "");
	assertEquals(z.nullable(z.boolean()).parse(false), false);
	rejects(z.nullable(z.string()), [undefined, 12]);
});

Deno.test("enum keeps literal types", () => {
	const role = z.enum(["admin", "user"]);
	const parsed: "admin" | "user" = role.parse("admin");

	assertEquals(parsed, "admin");
	rejects(role, ["guest", undefined]);
});

Deno.test("object strips unknown keys and reports nested paths", () => {
	const schema = z.object({
		name: z.string(),
		age: z.optional(z.number()),
		address: z.object({ zip: z.number() }),
	});

	assertEquals(schema.parse({ name: "a", extra: 1, address: { zip: "75" } }), { name: "a", address: { zip: 75 } });

	const result = schema.safeParse({ address: { zip: "x" } });
	assert(!result.success);
	assertEquals(result.error.issues.map((issue) => issue.path), [["name"], ["address", "zip"]]);
});

Deno.test("object accepts a JSON string and partial() makes keys optional", () => {
	const schema = z.object({ a: z.number() });

	assertEquals(schema.parse('{"a":1}'), { a: 1 });
	assertEquals(schema.partial().parse({}), {});
	rejects(schema, ["{bad", [], null, 5]);
});

Deno.test("array", () => {
	assertEquals(z.array(z.number()).parse([1, "2"]), [1, 2]);
	assertEquals(z.array(z.number()).parse("[1,2]"), [1, 2]);
	rejects(z.array(z.number()).min(2), [[1]]);
	rejects(z.array(z.number()).max(1), [[1, 2]]);
	rejects(z.array(z.number()).length(1), [[], [1, 2]]);
	rejects(z.array(z.number()), ["{", {}, null]);

	const result = z.array(z.number()).safeParse([1, "x"]);
	assert(!result.success);
	assertEquals(result.error.issues[0].path, [1]);
});

Deno.test("union", () => {
	const shape = z.union([
		z.object({ type: z.literal("a"), value: z.number() }),
		z.object({ type: z.literal("b"), value: z.string() }),
	]);

	assertEquals(shape.parse({ type: "b", value: "x" }), { type: "b", value: "x" });
	rejects(shape, [{ type: "c", value: 1 }, { type: "a", value: "x" }]);

	const parsed: InferSchemaType<typeof shape> = { type: "a", value: 1 };
	assertEquals(parsed.type, "a");
});
