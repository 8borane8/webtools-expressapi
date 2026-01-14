import { CryptoHelper } from "./crypto.ts";

const htmlEscapes: Array<[string, string]> = [
	["&", "&amp;"],
	["<", "&lt;"],
	[">", "&gt;"],
	['"', "&quot;"],
	["'", "&#39;"],
];

export abstract class StringHelper {
	public static generateRandomString(
		pattern: string = "XXXX-XXXX-XXXX-XXXX",
		chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
	): string {
		const p = Array.from(pattern);
		const s = p.map((c) => (c === "X" ? chars[Math.floor(CryptoHelper.secureRandom() * chars.length)] : c));
		return s.join("");
	}

	public static encodeBase64Url(data: string): string {
		return btoa(data)
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
	}

	public static decodeBase64Url(data: string): string {
		const base64 = data
			.replace(/-/g, "+")
			.replace(/_/g, "/");

		const padding = base64.length % 4;
		const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;

		return atob(paddedBase64);
	}

	public static normalizePath(...parts: string[]): string {
		return (
			"/" +
			parts
				.join("/")
				.replace(/\/+/g, "/") // Remove multiple slashes
				.replace(/^\/|\/$/g, "") // Remove leading and trailing slashes
		);
	}

	public static slugify(str: string): string {
		return str
			.toLowerCase()
			.trim()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "") // Remove accents
			.replace(/[^\w\s-]/g, "") // Remove special characters
			.replace(/[\s_-]+/g, "-") // Replace spaces and underscores by dashes
			.replace(/^-+|-+$/g, ""); // Remove dashes at the beginning/end
	}

	public static escapeHtml(str: string): string {
		return htmlEscapes.reduce((result, [char, entity]) => result.replaceAll(char, entity), str);
	}

	public static unescapeHtml(str: string): string {
		return htmlEscapes.reduce((result, [char, entity]) => result.replaceAll(entity, char), str);
	}

	public static clean(str: string): string {
		return str.trim().replace(/\s+/g, " ");
	}
}
