import { crypto } from "@std/crypto";

/**
 * A module containing the CryptoHelper class.
 * @module CryptoHelper
 */

/**
 * A class for cryptographic functions.
 * @class CryptoHelper
 */
export class CryptoHelper {
	private static readonly encoder = new TextEncoder();

	/**
	 * Generate a SHA-256 hash of a string.
	 * @method sha256
	 * @static
	 * @param {string} payload - The string to generate a SHA-256 hash for.
	 * @returns {Promise<string>} The SHA-256 hash of the string.
	 */
	public static async sha256(payload: string): Promise<string> {
		const hashBuffer = await crypto.subtle.digest(
			"SHA-256",
			this.encoder.encode(payload),
		);

		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
}
