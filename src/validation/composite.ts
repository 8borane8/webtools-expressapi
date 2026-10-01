import { BaseSchema, type InferSchemaType, type Issue, type Schema, ValidationError } from "./base.ts";

type OptionalKeys<T> = { [K in keyof T]: undefined extends InferSchemaType<T[K]> ? K : never }[keyof T];

/** The type of an object schema: keys whose schema accepts `undefined` become optional. */
export type InferShape<T extends Record<string, Schema>> =
	& { [K in Exclude<keyof T, OptionalKeys<T>>]: InferSchemaType<T[K]> }
	& { [K in OptionalKeys<T>]?: InferSchemaType<T[K]> };

type PartialShape<T extends Record<string, Schema>> = {
	[K in keyof T]: OptionalSchema<InferSchemaType<T[K]>>;
};

/** Parses `value` with `schema`, returning the issues found at `key` instead of throwing. */
function parseAt<T>(schema: Schema<T>, value: unknown, key: string | number): { data?: T; issues: Issue[] } {
	try {
		return { data: schema.parse(value), issues: [] };
	} catch (error) {
		if (!(error instanceof ValidationError)) {
			return { issues: [{ path: [key], message: String(error), code: "custom_error" }] };
		}

		return { issues: error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })) };
	}
}

// Nested objects and arrays can arrive as JSON strings (multipart forms).
function fromJsonString(data: unknown, expected: string, fail: (message: string, code: string) => never): unknown {
	if (typeof data !== "string") return data;

	try {
		return JSON.parse(data);
	} catch {
		return fail(`Expected ${expected}, got invalid JSON string`, "invalid_json");
	}
}

/**
 * Validates an object against a shape. Unknown keys are dropped, every error is reported with its path. A JSON string
 * is parsed first (nested objects arrive that way in multipart forms).
 */
export class ObjectSchema<T extends Record<string, Schema>> extends BaseSchema<InferShape<T>> {
	/**
	 * @param shape The schema of each key.
	 * @param message Replaces the default error message when the value is not an object.
	 */
	constructor(private readonly shape: T, message?: string) {
		super(message);
	}

	/** Returns a copy of this schema where every property is optional (shallow). */
	partial(): ObjectSchema<PartialShape<T>> {
		const shape = {} as PartialShape<T>;
		for (const key of Object.keys(this.shape) as Array<keyof T>) {
			shape[key] = new OptionalSchema(this.shape[key]) as PartialShape<T>[typeof key];
		}
		return new ObjectSchema(shape, this.message);
	}

	protected override coerce(input: unknown): InferShape<T> {
		const data = fromJsonString(input, "object", (message, code) => this.fail(message, code));

		if (typeof data !== "object" || data === null || Array.isArray(data)) {
			this.fail(`Expected object, got ${typeof data}`, "invalid_type");
		}

		const result: Record<string, unknown> = {};
		const issues: Issue[] = [];

		for (const [key, schema] of Object.entries(this.shape)) {
			const parsed = parseAt(schema, (data as Record<string, unknown>)[key], key);
			issues.push(...parsed.issues);
			if (parsed.data !== undefined) result[key] = parsed.data;
		}

		if (issues.length > 0) throw new ValidationError(issues);
		return result as InferShape<T>;
	}
}

/** Validates an array whose items all match a schema. A JSON string is parsed first. */
export class ArraySchema<T> extends BaseSchema<T[]> {
	/**
	 * @param itemSchema The schema of every item.
	 * @param message Replaces the default error message when the value is not an array.
	 */
	constructor(private readonly itemSchema: Schema<T>, message?: string) {
		super(message);
	}

	/** Requires at least `length` items. */
	min(length: number, message?: string): this {
		return this.addCheck(
			(v) => v.length >= length,
			"too_small",
			`Array must have at least ${length} items`,
			message,
		);
	}

	/** Requires at most `length` items. */
	max(length: number, message?: string): this {
		return this.addCheck((v) => v.length <= length, "too_big", `Array must have at most ${length} items`, message);
	}

	/** Requires exactly `length` items. */
	length(length: number, message?: string): this {
		return this.addCheck(
			(v) => v.length === length,
			"invalid_length",
			`Array must have exactly ${length} items`,
			message,
		);
	}

	protected override coerce(input: unknown): T[] {
		const data = fromJsonString(input, "array", (message, code) => this.fail(message, code));

		if (!Array.isArray(data)) this.fail(`Expected array, got ${typeof data}`, "invalid_type");

		const result: T[] = [];
		const issues: Issue[] = [];

		data.forEach((item, index) => {
			const parsed = parseAt(this.itemSchema, item, index);
			issues.push(...parsed.issues);
			result.push(parsed.data as T);
		});

		if (issues.length > 0) throw new ValidationError(issues);
		return result;
	}
}

type UnionType<T extends Schema[]> = InferSchemaType<T[number]>;

/** Accepts a value matching any of the schemas; the first one that matches wins. */
export class UnionSchema<T extends Schema[]> extends BaseSchema<UnionType<T>> {
	/**
	 * @param schemas The accepted schemas, tried in order.
	 * @param message Replaces the default error message.
	 */
	constructor(private readonly schemas: T, message?: string) {
		super(message);
	}

	protected override coerce(data: unknown): UnionType<T> {
		for (const schema of this.schemas) {
			const result = schema.safeParse(data);
			if (result.success) return result.data as UnionType<T>;
		}

		return this.fail("Value does not match any of the expected types", "invalid_union");
	}
}

/** Accepts one of a fixed list of values. The type is the union of the listed values. */
export class EnumSchema<const T extends readonly unknown[]> extends BaseSchema<T[number]> {
	/**
	 * @param values The accepted values.
	 * @param message Replaces the default error message.
	 */
	constructor(private readonly values: T, message?: string) {
		super(message);
	}

	protected override coerce(data: unknown): T[number] {
		if (!this.values.includes(data)) {
			this.fail(
				`Expected one of [${this.values.map(String).join(", ")}], got ${String(data)}`,
				"invalid_enum_value",
			);
		}
		return data as T[number];
	}
}

/** Accepts `undefined`, otherwise validates with the wrapped schema. */
export class OptionalSchema<T> extends BaseSchema<T | undefined> {
	/** @param schema The schema applied when a value is present. */
	constructor(private readonly schema: Schema<T>) {
		super();
	}

	protected override coerce(data: unknown): T | undefined {
		if (data !== undefined) return this.schema.parse(data);
	}
}

/** Accepts `null`, otherwise validates with the wrapped schema. Falsy values (`0`, `""`, `false`) are not `null`. */
export class NullableSchema<T> extends BaseSchema<T | null> {
	/** @param schema The schema applied when the value is not `null`. */
	constructor(private readonly schema: Schema<T>) {
		super();
	}

	protected override coerce(data: unknown): T | null {
		return data === null ? null : this.schema.parse(data);
	}
}
