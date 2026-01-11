import type { RequestListener } from "../interfaces/RequestListener.ts";
import type { HttpRequest } from "../web/HttpRequest.ts";
import type { HttpResponse } from "../web/HttpResponse.ts";
import type { TBodyDefault, TDataDefault } from "../interfaces/Types.ts";
import type { Schema } from "./Schema.ts";

export function validateBody<T, TData = TDataDefault>(schema: Schema<T>): RequestListener<T, TData> {
	return (req: HttpRequest<TBodyDefault, TData>, res: HttpResponse): Response | void => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			return res.status(400).json({
				success: false,
				error: "400 Bad Request.",
				issues: result.error.issues,
			});
		}

		(req as HttpRequest<T, TData>).body = result.data;
	};
}
