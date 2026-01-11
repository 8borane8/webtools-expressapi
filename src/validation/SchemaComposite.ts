import { BaseSchema, type Schema, ValidationError } from "./BaseSchema.ts";

export abstract class SchemaComposite {
	static object<T extends Record<string, Schema>>(shape: T, message?: string): ObjectSchema<T> {
		return new ObjectSchema(shape, message);
	}

	static array<T>(itemSchema: Schema<T>, message?: string): ArraySchema<T> {
		return new ArraySchema(itemSchema, message);
	}

	static optional<T>(schema: Schema<T>): OptionalSchema<T> {
		return new OptionalSchema(schema);
	}

	static nullable<T>(schema: Schema<T>): NullableSchema<T> {
		return new NullableSchema(schema);
	}

	static union<T extends [Schema, Schema, ...Schema[]]>(...args: [...T, string?]): UnionSchema<T> {
		const lastArg = args[args.length - 1];
		const hasMessage = typeof lastArg === "string";
		const schemas = (hasMessage ? args.slice(0, -1) : args) as T;
		const message = hasMessage ? lastArg : undefined;
		return new UnionSchema(schemas, message);
	}

	static enum<T extends [string, ...string[]]>(values: T, message?: string): EnumSchema<T[number]> {
		return new EnumSchema(values, message);
	}
}

export class ObjectSchema<T extends Record<string, Schema>> extends BaseSchema<
	{
		[K in keyof T]: T[K] extends Schema<infer U> ? U : never;
	}
> {
	private message?: string;

	constructor(
		private readonly shape: T,
		message?: string,
	) {
		super();
		this.message = message;
	}

	override parse(data: unknown): {
		[K in keyof T]: T[K] extends Schema<infer U> ? U : never;
	} {
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
	private message?: string;
	private minLength?: { value: number; message: string };
	private maxLength?: { value: number; message: string };

	constructor(
		private readonly itemSchema: Schema<T>,
		message?: string,
	) {
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

export class OptionalSchema<T> extends BaseSchema<T | undefined> {
	constructor(private readonly schema: Schema<T>) {
		super();
	}

	override parse(data: unknown): T | undefined {
		return data === undefined ? undefined : this.schema.parse(data);
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

export class UnionSchema<T extends [Schema, Schema, ...Schema[]]> extends BaseSchema<
	T[number] extends Schema<infer U> ? U : never
> {
	constructor(
		private readonly schemas: T,
		private readonly errorMessage?: string,
	) {
		super();
	}

	override parse(data: unknown): T[number] extends Schema<infer U> ? U : never {
		for (const schema of this.schemas) {
			try {
				return schema.parse(data) as T[number] extends Schema<infer U> ? U : never;
			} catch {
				// Continue to next schema
			}
		}

		const errorMsg = this.errorMessage ?? "Value does not match any of the expected types";
		throw new ValidationError([{
			path: [],
			message: errorMsg,
			code: "invalid_union",
		}]);
	}
}

export class EnumSchema<T extends string> extends BaseSchema<T> {
	constructor(
		private readonly values: readonly string[],
		private readonly message?: string,
	) {
		super();
	}

	override parse(data: unknown): T {
		const str = String(data);
		if (!this.values.includes(str)) {
			const errorMsg = this.message ?? `Expected one of [${this.values.join(", ")}], got ${str}`;
			throw this.createError([], errorMsg, "invalid_enum_value");
		}
		return str as T;
	}
}
