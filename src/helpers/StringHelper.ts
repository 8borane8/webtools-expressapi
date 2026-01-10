import { CryptoHelper } from "./CryptoHelper.ts";

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

	public static capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	public static toPascalCase(str: string): string {
		return str
			.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
			.replace(/\s+/g, "");
	}

	public static escapeHtml(str: string): string {
		const htmlEscapes: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};

		return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
	}

	public static unescapeHtml(str: string): string {
		const htmlUnescapes: Record<string, string> = {
			"&amp;": "&",
			"&lt;": "<",
			"&gt;": ">",
			"&quot;": '"',
			"&#39;": "'",
		};

		return str.replace(/&(amp|lt|gt|quot|#39);/g, (match) => htmlUnescapes[match] || match);
	}

	public static clean(str: string): string {
		return str.trim().replace(/\s+/g, " ");
	}
}
