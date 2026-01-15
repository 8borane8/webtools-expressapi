import { BaseSchema } from "./base.ts";

export class StringSchema extends BaseSchema<string> {
	private minLength?: { value: number; message: string };
	private maxLength?: { value: number; message: string };
	private exactLength?: { value: number; message: string };
	private startsWithConstraint?: { prefix: string; message: string };
	private endsWithConstraint?: { suffix: string; message: string };
	private patterns: Array<{ pattern: RegExp; message: string }> = [];
	private isEmail?: string;
	private isUuid?: string;
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

	length(length: number, message: string = this.message ?? `String must be exactly ${length} characters`): this {
		this.exactLength = { value: length, message };
		return this;
	}

	startsWith(prefix: string, message: string = this.message ?? `String must start with "${prefix}"`): this {
		this.startsWithConstraint = { prefix, message };
		return this;
	}

	endsWith(suffix: string, message: string = this.message ?? `String must end with "${suffix}"`): this {
		this.endsWithConstraint = { suffix, message };
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

	uuid(message: string = this.message ?? "Invalid UUID format"): this {
		this.isUuid = message;
		return this;
	}

	url(message: string = this.message ?? "Invalid URL format"): this {
		this.isUrl = message;
		return this;
	}

	override parse(data: unknown): string {
		const str = String(data);

		if (this.minLength && str.length < this.minLength.value) {
			throw this.createError([], this.minLength.message, "too_small");
		}

		if (this.maxLength && str.length > this.maxLength.value) {
			throw this.createError([], this.maxLength.message, "too_big");
		}

		if (this.exactLength && str.length !== this.exactLength.value) {
			throw this.createError([], this.exactLength.message, "invalid_length");
		}

		if (this.startsWithConstraint && !str.startsWith(this.startsWithConstraint.prefix)) {
			throw this.createError([], this.startsWithConstraint.message, "invalid_string");
		}

		if (this.endsWithConstraint && !str.endsWith(this.endsWithConstraint.suffix)) {
			throw this.createError([], this.endsWithConstraint.message, "invalid_string");
		}

		for (const { pattern, message } of this.patterns) {
			if (!pattern.test(str)) {
				throw this.createError([], message, "invalid_string");
			}
		}

		if (this.isEmail !== undefined) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
			if (!emailRegex.test(str)) {
				throw this.createError([], this.isEmail, "invalid_string");
			}
		}

		if (this.isUuid !== undefined) {
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(str)) {
				throw this.createError([], this.isUuid, "invalid_string");
			}
		}

		if (this.isUrl !== undefined) {
			const urlRegex = /^https?:\/\/.+/;
			if (!urlRegex.test(str)) {
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

	override parse(data: unknown): number {
		const num = Number(data);

		if (isNaN(num)) {
			const errorMsg = this.message ?? `Cannot convert "${data}" to number`;
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

	override parse(data: unknown): boolean {
		const str = String(data);

		if (str === "true" || str === "1" || str === "on") {
			return true;
		}

		if (str === "false" || str === "0" || str === "off") {
			return false;
		}

		const errorMsg = this.message ?? `Cannot convert "${str}" to boolean. Expected "true", "false", "1", or "0"`;
		throw this.createError([], errorMsg, "invalid_type");
	}
}

export class FileSchema extends BaseSchema<File> {
	private minSizeConstraint?: { value: number; message: string };
	private maxSizeConstraint?: { value: number; message: string };
	private allowedTypes?: { types: string[]; message: string };

	constructor(private readonly message?: string) {
		super();
	}

	minSize(size: number, message: string = this.message ?? `File size must be at least ${size} bytes`): this {
		this.minSizeConstraint = { value: size, message };
		return this;
	}

	maxSize(size: number, message: string = this.message ?? `File size must be at most ${size} bytes`): this {
		this.maxSizeConstraint = { value: size, message };
		return this;
	}

	type(types: string[], message: string = this.message ?? `File type must be one of: ${types.join(", ")}`): this {
		this.allowedTypes = { types, message };
		return this;
	}

	override parse(data: unknown): File {
		if (!(data instanceof File)) {
			const errorMsg = this.message ?? `Expected File, got ${typeof data}`;
			throw this.createError([], errorMsg, "invalid_type");
		}

		if (this.minSizeConstraint && data.size < this.minSizeConstraint.value) {
			throw this.createError([], this.minSizeConstraint.message, "too_small");
		}

		if (this.maxSizeConstraint && data.size > this.maxSizeConstraint.value) {
			throw this.createError([], this.maxSizeConstraint.message, "too_big");
		}

		if (this.allowedTypes && !this.allowedTypes.types.find((type) => data.type.startsWith(type))) {
			throw this.createError([], this.allowedTypes.message, "invalid_type");
		}

		return data;
	}
}

export class AnySchema extends BaseSchema<unknown> {
	override parse(data: unknown): unknown {
		return data;
	}
}
