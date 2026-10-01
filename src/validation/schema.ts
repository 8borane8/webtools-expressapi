import { AnySchema, BooleanSchema, FileSchema, LiteralSchema, NumberSchema, StringSchema } from "./primordials.ts";
import { ArraySchema, EnumSchema, NullableSchema, ObjectSchema, OptionalSchema, UnionSchema } from "./composite.ts";
import type { Schema } from "./base.ts";

abstract class SchemaBuilder {
	/** A string. Chain `.min()`, `.max()`, `.email()`, `.uuid()`, `.url()`, `.regex()`... to constrain it. */
	static string(message?: string): StringSchema {
		return new StringSchema(message);
	}

	/** A number, also accepted from a numeric string. Chain `.min()`, `.max()`, `.int()`, `.positive()`... */
	static number(message?: string): NumberSchema {
		return new NumberSchema(message);
	}

	/** A boolean, also accepted from `"true"`, `"false"`, `"1"`, `"0"`, `"on"` and `"off"`. */
	static boolean(message?: string): BooleanSchema {
		return new BooleanSchema(message);
	}

	/** An uploaded `File`. Chain `.minSize()`, `.maxSize()` and `.type()` to constrain it. */
	static file(message?: string): FileSchema {
		return new FileSchema(message);
	}

	/**
	 * An exact value, typed literally: `z.literal("admin")` gives `"admin"`, not `string`.
	 * Useful in unions: `z.union([z.object({ type: z.literal("a") }), z.object({ type: z.literal("b") })])`.
	 */
	static literal<const T extends string | number | boolean | null>(value: T, message?: string): LiteralSchema<T> {
		return new LiteralSchema(value, message);
	}

	/** Any value, unchecked. */
	static any(): AnySchema {
		return new AnySchema();
	}

	/** An object with the given shape. Unknown keys are dropped. */
	static object<T extends Record<string, Schema>>(shape: T, message?: string): ObjectSchema<T> {
		return new ObjectSchema(shape, message);
	}

	/** An array whose items all match `itemSchema`. Chain `.min()`, `.max()` or `.length()` to constrain it. */
	static array<T>(itemSchema: Schema<T>, message?: string): ArraySchema<T> {
		return new ArraySchema(itemSchema, message);
	}

	/** A value matching any of the schemas, tried in order. */
	static union<T extends Schema[]>(schemas: T, message?: string): UnionSchema<T> {
		return new UnionSchema(schemas, message);
	}

	/** One of a fixed list of values, typed as their union: `z.enum(["a", "b"])` gives `"a" | "b"`. */
	static enum<const T extends readonly unknown[]>(values: T, message?: string): EnumSchema<T> {
		return new EnumSchema(values, message);
	}

	/** Makes a schema accept `undefined`; the key becomes optional in `z.object`. */
	static optional<T>(schema: Schema<T>): OptionalSchema<T> {
		return new OptionalSchema(schema);
	}

	/** Makes a schema accept `null`. */
	static nullable<T>(schema: Schema<T>): NullableSchema<T> {
		return new NullableSchema(schema);
	}
}

/**
 * Schema builder, for `body`, `query` and `params` of a route and for `JsonToken.verify`.
 *
 * @example
 * ```ts
 * const user = z.object({
 * 	name: z.string().min(1).max(50),
 * 	age: z.optional(z.number().int().min(0)),
 * 	role: z.enum(["admin", "user"]),
 * });
 *
 * type User = InferSchemaType<typeof user>;
 * ```
 */
export const z = SchemaBuilder;
