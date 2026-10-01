import type { Route } from "./route.ts";

export function normalizePath(...parts: string[]): string {
	return "/" + parts
		.join("/")
		.replace(/\/+/g, "/")
		.replace(/^\/|\/$/g, "");
}

/** Routes with the same segment count are tried static-first: `/users/me` wins over `/users/:id`. */
export function compareRoutes(a: Route, b: Route): number {
	const rank = (route: Route) => route.url.split("/").map((s) => s.startsWith(":") ? "1" : "0").join("");
	return rank(a).localeCompare(rank(b));
}

function decode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function findRoute(
	routes: Route[] | undefined,
	pathname: string,
): { route: Route; params: Record<string, string> } | null {
	const parts = pathname.split("/");

	for (const route of routes ?? []) {
		const routeParts = route.url.split("/");
		if (routeParts.length !== parts.length) continue;

		const params: Record<string, string> = Object.create(null);
		const matches = routeParts.every((routePart, i) => {
			if (!routePart.startsWith(":")) return routePart === parts[i];
			if (!parts[i]) return false;

			params[routePart.slice(1)] = decode(parts[i]);
			return true;
		});

		if (matches) return { route, params };
	}

	return null;
}
