/** The HTTP methods a route can be registered for. */
export const HttpMethods = {
	GET: "GET",
	POST: "POST",
	PUT: "PUT",
	PATCH: "PATCH",
	DELETE: "DELETE",
} as const;

/** One of the values of {@linkcode HttpMethods}. */
export type HttpMethods = typeof HttpMethods[keyof typeof HttpMethods];
