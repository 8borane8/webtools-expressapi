import { secureRandom } from "./crypto.ts";

const htmlEscapes: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

const htmlUnescapes = Object.fromEntries(Object.entries(htmlEscapes).map(([char, entity]) => [entity, char]));

/**
 * Generates a random string from a pattern, using a cryptographically secure source.
 * Every `X` in the pattern is replaced by a random character, everything else is kept as is.
 *
 * @example
 * ```ts
 * StringHelper.generateRandomString(); // "K3F9-A0ZP-Q7LM-2XWD"
 * StringHelper.generateRandomString("ID-XXX", "ab"); // "ID-bab"
 * ```
 * @param pattern The template, `X` marks a random character.
 * @param chars The characters to pick from.
 */
export function generateRandomString(
	pattern: string = "XXXX-XXXX-XXXX-XXXX",
	chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
): string {
	return Array.from(pattern, (c) => c === "X" ? chars[Math.floor(secureRandom() * chars.length)] : c).join("");
}

/**
 * Escapes `& < > " '` so a string can be inserted in HTML safely.
 *
 * @param str The raw text.
 */
export function escapeHtml(str: string): string {
	return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Reverts {@linkcode escapeHtml}. Decoding happens in a single pass, so `&amp;lt;` becomes `&lt;`, not `<`.
 *
 * @param str The escaped text.
 */
export function unescapeHtml(str: string): string {
	return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => htmlUnescapes[entity]);
}

/**
 * Turns a text into a URL-friendly slug: lowercase, without accents, words joined by dashes.
 *
 * @example
 * ```ts
 * StringHelper.slugify("  Crème brûlée & Co! "); // "creme-brulee-co"
 * ```
 * @param str The text to slugify.
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Trims a string and collapses every run of whitespace into a single space.
 *
 * @param str The text to clean.
 */
export function clean(str: string): string {
	return str.trim().replace(/\s+/g, " ");
}
