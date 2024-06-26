/**
 * A module containing the StringHelper class.
 * @module StringHelper
 */

/**
 * A class for manipulating strings.
 * @class StringHelper
 */
export class StringHelper {
	/**
	 * Escape HTML entities in a string.
	 * @method escapehtmlEntities
	 * @static
	 * @param {string} payload - The string to escape HTML entities in.
	 * @returns {string} The string with escaped HTML entities.
	 */
	public static escapehtmlEntities(payload: string): string {
		return payload
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	/**
	 * Unescape HTML entities in a string.
	 * @method unescapehtmlEntities
	 * @static
	 * @param {string} payload - The string to unescape HTML entities in.
	 * @returns {string} The string with unescaped HTML entities.
	 */
	public static unescapehtmlEntities(payload: string): string {
		return payload
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"');
	}

	/**
	 * Generate a random string based on a pattern.
	 * @method generateRandomString
	 * @static
	 * @param {string} [pattern="XXXX-XXXX-XXXX-XXXX"] - The pattern to generate the random string with. "X" will be replaced with a random character.
	 * @param {string} [characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"] - The characters to use for random string generation.
	 * @returns {string} The generated random string.
	 */
	public static generateRandomString(
		pattern: string = "XXXX-XXXX-XXXX-XXXX",
		characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
	): string {
		const array = Array.from(pattern);
		const randomArray = array.map((c) =>
			c == "X"
				? characters[Math.floor(Math.random() * characters.length)]
				: c
		);
		return randomArray.join("");
	}
}
