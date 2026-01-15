import { BaseSchema, type InferSchemaType, type Schema, ValidationError } from "./base.ts";

export class ObjectSchema<T extends Record<string, Schema>>
	extends BaseSchema<{ [K in keyof T]: InferSchemaType<T[K]> }> {
	constructor(private readonly shape: T, private readonly message?: string) {
		super();
	}

	override parse(data: unknown): { [K in keyof T]: T[K] extends Schema<infer U> ? U : never } {
		if (typeof data !== "object" || data === null || Array.isArray(data)) {
			const errorMsg = this.message ?? `Expected object, got ${typeof data}`;
			throw this.createError([], errorMsg, "invalid_type");
		}

		const result: Record<string, unknown> = {};
		const errors: Array<{ path: (string | number)[]; message: string; code: string }> = [];

		for (const [key, schema] of Object.entries(this.shape)) {
			try {
				result[key] = schema.parse((data as Record<string, unknown>)[key]);
			} catch (error) {
				if (error instanceof ValidationError) {
					errors.push(...error.issues.map((issue) => ({
						path: [key, ...issue.path],
						message: issue.message,
						code: issue.code,
					})));
				} else {
					errors.push({ path: [key], message: String(error), code: "custom_error" });
				}
			}
		}

		if (errors.length > 0) {
			throw new ValidationError(errors);
		}

		return result as {
			[K in keyof T]: T[K] extends Schema<infer U> ? U : never;
		};
	}
}

export class ArraySchema<T> extends BaseSchema<T[]> {
	private minLength?: { value: number; message: string };
	private maxLength?: { value: number; message: string };
	private exactLength?: { value: number; message: string };

	constructor(private readonly itemSchema: Schema<T>, private readonly message?: string) {
		super();
		this.message = message;
	}

	min(length: number, message: string = this.message ?? `Array must have at least ${length} items`): this {
		this.minLength = { value: length, message };
		return this;
	}

	max(length: number, message: string = this.message ?? `Array must have at most ${length} items`): this {
		this.maxLength = { value: length, message };
		return this;
	}

	length(length: number, message: string = this.message ?? `Array must have exactly ${length} items`): this {
		this.exactLength = { value: length, message };
		return this;
	}

	override parse(data: unknown): T[] {
		if (!Array.isArray(data)) {
			const errorMsg = this.message ?? `Expected array, got ${typeof data}`;
			throw this.createError([], errorMsg, "invalid_type");
		}

		if (this.minLength && data.length < this.minLength.value) {
			throw this.createError([], this.minLength.message, "too_small");
		}

		if (this.maxLength && data.length > this.maxLength.value) {
			throw this.createError([], this.maxLength.message, "too_big");
		}

		if (this.exactLength && data.length !== this.exactLength.value) {
			throw this.createError([], this.exactLength.message, "invalid_length");
		}

		const errors: Array<{ path: (string | number)[]; message: string; code: string }> = [];
		const result: T[] = [];

		for (let i = 0; i < data.length; i++) {
			try {
				result.push(this.itemSchema.parse(data[i]));
			} catch (error) {
				if (error instanceof ValidationError) {
					errors.push(...error.issues.map((issue) => ({
						path: [i, ...issue.path],
						message: issue.message,
						code: issue.code,
					})));
				} else {
					errors.push({ path: [i], message: String(error), code: "custom_error" });
				}
			}
		}

		if (errors.length > 0) {
			throw new ValidationError(errors);
		}

		return result;
	}
}

export class UnionSchema<T extends Schema[]> extends BaseSchema<T[number] extends Schema<infer U> ? U : never> {
	constructor(private readonly schemas: T, private readonly message?: string) {
		super();
	}

	override parse(data: unknown): T[number] extends Schema<infer U> ? U : never {
		for (const schema of this.schemas) {
			try {
				return schema.parse(data) as T[number] extends Schema<infer U> ? U : never;
				// deno-lint-ignore no-empty
			} catch {}
		}

		const errorMsg = this.message ?? "Value does not match any of the expected types";
		throw this.createError([], errorMsg, "invalid_union");
	}
}

export class EnumSchema<T extends unknown[]> extends BaseSchema<T[number]> {
	constructor(private readonly values: T, private readonly message?: string) {
		super();
	}

	override parse(data: unknown): T[number] {
		if (!this.values.includes(data)) {
			const valuesStr = this.values.map((v) => String(v)).join(", ");
			const errorMsg = this.message ?? `Expected one of [${valuesStr}], got ${String(data)}`;
			throw this.createError([], errorMsg, "invalid_enum_value");
		}
		return data;
	}
}

export class OptionalSchema<T> extends BaseSchema<T | undefined> {
	constructor(private readonly schema: Schema<T>) {
		super();
	}

	override parse(data: unknown): T | undefined {
		if (data !== undefined) return this.schema.parse(data);
	}
}

export class NullableSchema<T> extends BaseSchema<T | null> {
	constructor(private readonly schema: Schema<T>) {
		super();
	}

	override parse(data: unknown): T | null {
		return data ? this.schema.parse(data) : null;
	}
}
