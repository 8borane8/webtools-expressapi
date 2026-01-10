import { SchemaPrimordials } from "./SchemaPrimordials.ts";
import { SchemaComposite } from "./SchemaComposite.ts";
import type { Schema } from "./BaseSchema.ts";

export * from "./BaseSchema.ts";

export class SchemaBuilder {
	static string(message?: string) {
		return SchemaPrimordials.string(message);
	}

	static number(message?: string) {
		return SchemaPrimordials.number(message);
	}

	static boolean(message?: string) {
		return SchemaPrimordials.boolean(message);
	}

	static object<T extends Record<string, Schema>>(shape: T, message?: string) {
		return SchemaComposite.object(shape, message);
	}

	static array<T>(itemSchema: Schema<T>, message?: string) {
		return SchemaComposite.array(itemSchema, message);
	}

	static optional<T>(schema: Schema<T>) {
		return SchemaComposite.optional(schema);
	}

	static nullable<T>(schema: Schema<T>) {
		return SchemaComposite.nullable(schema);
	}

	static union<T extends [Schema, Schema, ...Schema[]]>(...args: [...T, string?]) {
		return SchemaComposite.union(...args);
	}

	static enum<T extends [string, ...string[]]>(values: T, message?: string) {
		return SchemaComposite.enum(values, message);
	}

	static any() {
		return SchemaPrimordials.any();
	}
}

export const z = SchemaBuilder;
