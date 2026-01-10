import type { RequestListener } from "../interfaces/RequestListener.ts";
import type { HttpRequest } from "../interfaces/HttpRequest.ts";
import type { HttpResponse } from "../interfaces/HttpResponse.ts";
import type { Schema } from "./Schema.ts";

export function validateBody<T, TData = unknown>(schema: Schema<T>): RequestListener<unknown, TData> {
	return (req: HttpRequest<unknown, TData>, res: HttpResponse): Response | void => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			return res.status(400).json({
				success: false,
				error: "400 Bad Request.",
				issues: result.error.issues,
			});
		}

		req.body = result.data;
	};
}
