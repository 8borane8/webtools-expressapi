import { AnySchema, BooleanSchema, FileSchema, NumberSchema, StringSchema } from "./primordials.ts";
import { ArraySchema, EnumSchema, NullableSchema, ObjectSchema, OptionalSchema, UnionSchema } from "./composite.ts";
import type { Schema } from "./base.ts";

abstract class SchemaBuilder {
	static string(message?: string): StringSchema {
		return new StringSchema(message);
	}

	static number(message?: string): NumberSchema {
		return new NumberSchema(message);
	}

	static boolean(message?: string): BooleanSchema {
		return new BooleanSchema(message);
	}

	static file(message?: string): FileSchema {
		return new FileSchema(message);
	}

	static any(): AnySchema {
		return new AnySchema();
	}

	static object<T extends Record<string, Schema>>(shape: T, message?: string): ObjectSchema<T> {
		return new ObjectSchema(shape, message);
	}

	static array<T>(itemSchema: Schema<T>, message?: string): ArraySchema<T> {
		return new ArraySchema(itemSchema, message);
	}

	static union<T extends Schema[]>(schemas: T, message?: string): UnionSchema<T> {
		return new UnionSchema(schemas, message);
	}

	static enum<T extends unknown[]>(values: T, message?: string): EnumSchema<T> {
		return new EnumSchema(values, message);
	}

	static optional<T>(schema: Schema<T>): OptionalSchema<T> {
		return new OptionalSchema(schema);
	}

	static nullable<T>(schema: Schema<T>): NullableSchema<T> {
		return new NullableSchema(schema);
	}
}

export const z = SchemaBuilder;
