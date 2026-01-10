import { BaseSchema } from "./BaseSchema.ts";

export class SchemaPrimordials {
	static string(message?: string): StringSchema {
		return new StringSchema(message);
	}

	static number(message?: string): NumberSchema {
		return new NumberSchema(message);
	}

	static boolean(message?: string): BooleanSchema {
		return new BooleanSchema(message);
	}

	static any(): AnySchema {
		return new AnySchema();
	}
}

export class StringSchema extends BaseSchema<string> {
	private minLength?: { value: number; message: string };
	private maxLength?: { value: number; message: string };
	private patterns: Array<{ pattern: RegExp; message: string }> = [];
	private isEmail?: string;
	private isUrl?: string;

	constructor(private readonly message?: string) {
		super();
	}

	min(length: number, message: string = this.message ?? `String must be at least ${length} characters`): this {
		this.minLength = { value: length, message };
		return this;
	}

	max(length: number, message: string = this.message ?? `String must be at most ${length} characters`): this {
		this.maxLength = { value: length, message };
		return this;
	}

	regex(pattern: RegExp, message: string = this.message ?? "String does not match required pattern"): this {
		this.patterns.push({ pattern, message });
		return this;
	}

	email(message: string = this.message ?? "Invalid email format"): this {
		this.isEmail = message;
		return this;
	}

	url(message: string = this.message ?? "Invalid URL format"): this {
		this.isUrl = message;
		return this;
	}

	parse(data: unknown): string {
		const str = String(data);

		if (this.minLength && str.length < this.minLength.value) {
			throw this.createError([], this.minLength.message, "too_small");
		}

		if (this.maxLength && str.length > this.maxLength.value) {
			throw this.createError([], this.maxLength.message, "too_big");
		}

		for (const { pattern, message } of this.patterns) {
			if (!pattern.test(str)) {
				throw this.createError([], message, "invalid_string");
			}
		}

		if (this.isEmail !== undefined) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(str)) {
				throw this.createError([], this.isEmail, "invalid_string");
			}
		}

		if (this.isUrl !== undefined) {
			try {
				new URL(str);
			} catch {
				throw this.createError([], this.isUrl, "invalid_string");
			}
		}

		return str;
	}
}

export class NumberSchema extends BaseSchema<number> {
	private minValue?: { value: number; message: string };
	private maxValue?: { value: number; message: string };
	private isInt?: string;
	private isPositive?: string;
	private isNegative?: string;

	constructor(private readonly message?: string) {
		super();
	}

	min(value: number, message: string = this.message ?? `Number must be at least ${value}`): this {
		this.minValue = { value, message };
		return this;
	}

	max(value: number, message: string = this.message ?? `Number must be at most ${value}`): this {
		this.maxValue = { value, message };
		return this;
	}

	int(message: string = this.message ?? "Expected integer, got float"): this {
		this.isInt = message;
		return this;
	}

	positive(message: string = this.message ?? "Number must be positive"): this {
		this.isPositive = message;
		return this;
	}

	negative(message: string = this.message ?? "Number must be negative"): this {
		this.isNegative = message;
		return this;
	}

	parse(data: unknown): number {
		const str = String(data).trim();
		const num = this.isInt ? parseInt(str, 10) : parseFloat(str);

		if (isNaN(num)) {
			const errorMsg = this.message ?? `Cannot convert "${str}" to number`;
			throw this.createError([], errorMsg, "invalid_type");
		}

		if (this.isInt && !Number.isInteger(num)) {
			throw this.createError([], this.isInt, "invalid_type");
		}

		if (this.minValue && num < this.minValue.value) {
			throw this.createError([], this.minValue.message, "too_small");
		}

		if (this.maxValue && num > this.maxValue.value) {
			throw this.createError([], this.maxValue.message, "too_big");
		}

		if (this.isPositive && num <= 0) {
			throw this.createError([], this.isPositive, "too_small");
		}

		if (this.isNegative && num >= 0) {
			throw this.createError([], this.isNegative, "too_big");
		}

		return num;
	}
}

export class BooleanSchema extends BaseSchema<boolean> {
	constructor(private readonly message?: string) {
		super();
	}

	parse(data: unknown): boolean {
		const str = String(data).trim().toLowerCase();

		if (str === "true" || str === "1") {
			return true;
		}

		if (str === "false" || str === "0") {
			return false;
		}

		const errorMsg = this.message ?? `Cannot convert "${str}" to boolean. Expected "true", "false", "1", or "0"`;
		throw this.createError([], errorMsg, "invalid_type");
	}
}

export class AnySchema extends BaseSchema<unknown> {
	parse(data: unknown): unknown {
		return data;
	}
}
