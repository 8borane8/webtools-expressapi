import { SchemaPrimordials } from "./SchemaPrimordials.ts";
import { SchemaComposite } from "./SchemaComposite.ts";
import type { Schema } from "./BaseSchema.ts";

export * from "./BaseSchema.ts";

export abstract class SchemaBuilder {
	static string(message?: string): ReturnType<typeof SchemaPrimordials.string> {
		return SchemaPrimordials.string(message);
	}

	static number(message?: string): ReturnType<typeof SchemaPrimordials.number> {
		return SchemaPrimordials.number(message);
	}

	static boolean(message?: string): ReturnType<typeof SchemaPrimordials.boolean> {
		return SchemaPrimordials.boolean(message);
	}

	static object<T extends Record<string, Schema>>(
		shape: T,
		message?: string,
	): ReturnType<typeof SchemaComposite.object<T>> {
		return SchemaComposite.object(shape, message);
	}

	static array<T>(itemSchema: Schema<T>, message?: string): ReturnType<typeof SchemaComposite.array<T>> {
		return SchemaComposite.array(itemSchema, message);
	}

	static optional<T>(schema: Schema<T>): ReturnType<typeof SchemaComposite.optional<T>> {
		return SchemaComposite.optional(schema);
	}

	static nullable<T>(schema: Schema<T>): ReturnType<typeof SchemaComposite.nullable<T>> {
		return SchemaComposite.nullable(schema);
	}

	static union<T extends [Schema, Schema, ...Schema[]]>(
		...args: [...T, string?]
	): ReturnType<typeof SchemaComposite.union<T>> {
		return SchemaComposite.union(...args);
	}

	static enum<T extends [string, ...string[]]>(
		values: T,
		message?: string,
	): ReturnType<typeof SchemaComposite.enum<T>> {
		return SchemaComposite.enum(values, message);
	}

	static any(): ReturnType<typeof SchemaPrimordials.any> {
		return SchemaPrimordials.any();
	}

	static type<T>(
		// deno-lint-ignore no-explicit-any
		typeConstructor: new (...args: any[]) => T,
		message?: string,
	): ReturnType<typeof SchemaPrimordials.type<T>> {
		return SchemaPrimordials.type(typeConstructor, message);
	}
}

export const z = SchemaBuilder;
