export type ValidationResult<T> = {
	success: true;
	data: T;
} | {
	success: false;
	error: ValidationError;
};

export class ValidationError extends Error {
	constructor(
		public readonly issues: Array<{
			path: (string | number)[];
			message: string;
			code: string;
		}>,
	) {
		super(issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "));
		this.name = "ValidationError";
	}
}

export interface Schema<T = unknown> {
	parse(data: unknown): T;
	safeParse(data: unknown): ValidationResult<T>;
}

export type InferSchemaType<T> = T extends Schema<infer U> ? U : never;

export abstract class BaseSchema<T> implements Schema<T> {
	abstract parse(data: unknown): T;

	safeParse(data: unknown): ValidationResult<T> {
		try {
			return { success: true, data: this.parse(data) };
		} catch (error) {
			if (error instanceof ValidationError) {
				return { success: false, error };
			}
			throw error;
		}
	}

	protected createError(path: (string | number)[], message: string, code: string): ValidationError {
		return new ValidationError([{ path, message, code }]);
	}
}
