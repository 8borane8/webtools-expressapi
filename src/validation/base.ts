/** A single validation failure. */
export type Issue = {
	/** Where it happened: object keys and array indexes, empty for the root value. */
	path: (string | number)[];
	message: string;
	/** Machine-readable reason: `invalid_type`, `too_small`, `too_big`, `invalid_length`, `invalid_string`... */
	code: string;
};

/** Result of `safeParse`: the parsed data, or the error. */
export type ValidationResult<T> = { success: true; data: T } | { success: false; error: ValidationError };

/** Thrown by `parse`, carries every issue found. */
export class ValidationError extends Error {
	/**
	 * Creates an error from a list of issues.
	 *
	 * @param issues Every failure found, with its path.
	 */
	constructor(public readonly issues: Issue[]) {
		super(issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "));
		this.name = "ValidationError";
	}
}

/** Anything that can validate and convert unknown data into `T`. All `z` schemas implement it. */
export interface Schema<T = unknown> {
	/**
	 * Validates `data` and returns it typed.
	 *
	 * @throws {ValidationError} If the data is invalid.
	 */
	parse(data: unknown): T;
	/** Like `parse`, but returns the error instead of throwing it. */
	safeParse(data: unknown): ValidationResult<T>;
}

/** The type a schema produces: `InferSchemaType<typeof schema>`. */
export type InferSchemaType<T> = T extends Schema<infer U> ? U : never;

type Check<T> = { test: (value: T) => boolean; message: string; code: string };

/**
 * `coerce` turns raw input into `T`, then every check added with `addCheck` runs in order.
 * Schemas are immutable: `addCheck` returns a copy, so a shared base schema is never altered.
 */
export abstract class BaseSchema<T> implements Schema<T> {
	private checks: Check<T>[] = [];

	/** @param message Replaces every default error message of this schema. */
	constructor(protected readonly message?: string) {}

	protected abstract coerce(data: unknown): T;

	/**
	 * Validates `data` and returns it typed.
	 *
	 * @throws {ValidationError} If the data is invalid.
	 */
	parse(data: unknown): T {
		const value = this.coerce(data);

		for (const { test, message, code } of this.checks) {
			if (!test(value)) throw new ValidationError([{ path: [], message, code }]);
		}

		return value;
	}

	/** Like `parse`, but returns the error instead of throwing it. */
	safeParse(data: unknown): ValidationResult<T> {
		try {
			return { success: true, data: this.parse(data) };
		} catch (error) {
			if (error instanceof ValidationError) return { success: false, error };
			throw error;
		}
	}

	protected addCheck(test: (value: T) => boolean, code: string, fallback: string, message?: string): this {
		const clone: this = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
		clone.checks = [...this.checks, { test, code, message: message ?? this.message ?? fallback }];
		return clone;
	}

	protected fail(fallback: string, code: string): never {
		throw new ValidationError([{ path: [], message: this.message ?? fallback, code }]);
	}
}
