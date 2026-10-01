/** Parses the body according to its content type. Throws when the declared format is invalid. */
export async function parseBody(request: Request): Promise<unknown> {
	const contentType = request.headers.get("content-type") || "";

	if (contentType.startsWith("application/json")) {
		const text = await request.text();
		return text ? JSON.parse(text) : null;
	}

	if (contentType.startsWith("multipart/form-data")) {
		return Object.fromEntries(await request.formData());
	}

	if (contentType.startsWith("application/x-www-form-urlencoded")) {
		return Object.fromEntries(new URLSearchParams(await request.text()));
	}

	if (contentType.startsWith("application/octet-stream")) {
		return await request.arrayBuffer();
	}

	return await request.text();
}
