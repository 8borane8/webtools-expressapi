import { decodeBase64, encodeBase64 } from "@std/encoding";
import { crypto } from "@std/crypto";

/**
 * A module containing the CryptoHelper class.
 * @module CryptoHelper
 */

/**
 * A class for cryptographic functions.
 * @class CryptoHelper
 */
export default class CryptoHelper {
	private static readonly encoder = new TextEncoder();
	private static readonly decoder = new TextDecoder();

	/**
	 * Encode a string in base64.
	 * @method b64encode
	 * @static
	 * @param {string} payload - The string to encode in base64.
	 * @returns {string} The base64 encoded string.
	 */
	public static b64encode(payload: string): string {
		const encodedPayload = this.encoder.encode(payload);
		return encodeBase64(encodedPayload);
	}

	/**
	 * Decode a base64 encoded string.
	 * @method b64decode
	 * @static
	 * @param {string} payload - The base64 encoded string to decode.
	 * @returns {string} The decoded string.
	 */
	public static b64decode(payload: string): string {
		const payloadBuffer = decodeBase64(payload);
		return this.decoder.decode(payloadBuffer);
	}

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
