import { BaseSchema } from "./base.ts";

const numeric = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** Validates a string. Only real strings are accepted: numbers, objects and arrays are rejected. */
export class StringSchema extends BaseSchema<string> {
	/** Requires at least `length` characters. */
	min(length: number, message?: string): this {
		return this.addCheck(
			(v) => v.length >= length,
			"too_small",
			`String must be at least ${length} characters`,
			message,
		);
	}

	/** Requires at most `length` characters. */
	max(length: number, message?: string): this {
		return this.addCheck(
			(v) => v.length <= length,
			"too_big",
			`String must be at most ${length} characters`,
			message,
		);
	}

	/** Requires exactly `length` characters. */
	length(length: number, message?: string): this {
		return this.addCheck(
			(v) => v.length === length,
			"invalid_length",
			`String must be exactly ${length} characters`,
			message,
		);
	}

	/** Requires the string to start with `prefix`. */
	startsWith(prefix: string, message?: string): this {
		return this.addCheck(
			(v) => v.startsWith(prefix),
			"invalid_string",
			`String must start with "${prefix}"`,
			message,
		);
	}

	/** Requires the string to end with `suffix`. */
	endsWith(suffix: string, message?: string): this {
		return this.addCheck((v) => v.endsWith(suffix), "invalid_string", `String must end with "${suffix}"`, message);
	}

	/** Requires the string to match `pattern`. */
	regex(pattern: RegExp, message?: string): this {
		return this.addCheck(
			(v) => pattern.test(v),
			"invalid_string",
			"String does not match required pattern",
			message,
		);
	}

	/** Requires a basic email format (`a@b.c`). */
	email(message?: string): this {
		return this.addCheck(
			(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
			"invalid_string",
			"Invalid email format",
			message,
		);
	}

	/** Requires a UUID (any version). */
	uuid(message?: string): this {
		const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return this.addCheck((v) => uuid.test(v), "invalid_string", "Invalid UUID format", message);
	}

	/** Requires a parsable absolute URL. */
	url(message?: string): this {
		return this.addCheck((v) => URL.canParse(v), "invalid_string", "Invalid URL format", message);
	}

	protected override coerce(data: unknown): string {
		if (typeof data !== "string") this.fail(`Expected string, got ${typeof data}`, "invalid_type");
		return data;
	}
}

/**
 * Validates a number. Accepts finite numbers and decimal strings (`"5"`, `"-1.5"`, `"1e3"`), since query strings,
 * params and forms only carry strings. Rejects `NaN`, `Infinity`, hex strings, booleans, arrays and empty strings.
 */
export class NumberSchema extends BaseSchema<number> {
	/** Requires a value greater than or equal to `value`. */
	min(value: number, message?: string): this {
		return this.addCheck((v) => v >= value, "too_small", `Number must be at least ${value}`, message);
	}

	/** Requires a value less than or equal to `value`. */
	max(value: number, message?: string): this {
		return this.addCheck((v) => v <= value, "too_big", `Number must be at most ${value}`, message);
	}

	/** Requires an integer. */
	int(message?: string): this {
		return this.addCheck(Number.isInteger, "invalid_type", "Expected integer, got float", message);
	}

	/** Requires a value strictly greater than 0. */
	positive(message?: string): this {
		return this.addCheck((v) => v > 0, "too_small", "Number must be positive", message);
	}

	/** Requires a value strictly less than 0. */
	negative(message?: string): this {
		return this.addCheck((v) => v < 0, "too_big", "Number must be negative", message);
	}

	protected override coerce(data: unknown): number {
		if (typeof data === "number" && Number.isFinite(data)) return data;

		if (typeof data === "string" && numeric.test(data.trim())) {
			const value = Number(data);
			if (Number.isFinite(value)) return value;
		}

		return this.fail(
			typeof data === "string" ? `Cannot convert "${data}" to number` : `Expected number, got ${typeof data}`,
			"invalid_type",
		);
	}
}

/** Validates a boolean. Accepts `true`/`false`, and the strings or numbers `"true"`, `"1"`, `"on"`, `"false"`, `"0"`, `"off"`. */
export class BooleanSchema extends BaseSchema<boolean> {
	protected override coerce(data: unknown): boolean {
		if (typeof data === "boolean") return data;

		const str = typeof data === "string" || typeof data === "number" ? String(data) : "";
		if (str === "true" || str === "1" || str === "on") return true;
		if (str === "false" || str === "0" || str === "off") return false;

		return this.fail(
			`Cannot convert "${str || typeof data}" to boolean. Expected "true", "false", "1", or "0"`,
			"invalid_type",
		);
	}
}

/** Validates an uploaded `File` (from a multipart body). */
export class FileSchema extends BaseSchema<File> {
	/** Requires a file of at least `size` bytes. */
	minSize(size: number, message?: string): this {
		return this.addCheck((v) => v.size >= size, "too_small", `File size must be at least ${size} bytes`, message);
	}

	/** Requires a file of at most `size` bytes. */
	maxSize(size: number, message?: string): this {
		return this.addCheck((v) => v.size <= size, "too_big", `File size must be at most ${size} bytes`, message);
	}

	/** Requires the media type to start with one of `types`, e.g. `["image/", "application/pdf"]`. */
	type(types: string[], message?: string): this {
		return this.addCheck(
			(v) => types.some((type) => v.type.startsWith(type)),
			"invalid_type",
			`File type must be one of: ${types.join(", ")}`,
			message,
		);
	}

	protected override coerce(data: unknown): File {
		if (!(data instanceof File)) this.fail(`Expected File, got ${typeof data}`, "invalid_type");
		return data;
	}
}

/**
 * Validates an exact value. Since query, params and forms only carry strings, `"5"` matches the literal `5`
 * and `"true"` matches `true`.
 */
export class LiteralSchema<T extends string | number | boolean | null> extends BaseSchema<T> {
	/**
	 * @param value The only accepted value.
	 * @param message Replaces the default error message.
	 */
	constructor(private readonly value: T, message?: string) {
		super(message);
	}

	protected override coerce(data: unknown): T {
		const { value } = this;
		const matches = data === value ||
			((typeof value === "number" || typeof value === "boolean") && data === String(value));

		if (!matches) {
			this.fail(
				`Expected ${JSON.stringify(value)}, got ${JSON.stringify(data) ?? String(data)}`,
				"invalid_literal",
			);
		}
		return value;
	}
}

/** Accepts any value without checking it. */
export class AnySchema extends BaseSchema<unknown> {
	protected override coerce(data: unknown): unknown {
		return data;
	}
}
