import { encodeHex } from "@std/encoding/hex";

const encoder = new TextEncoder();

async function digest(algorithm: "SHA-256" | "SHA-512", payload: string): Promise<string> {
	return encodeHex(await crypto.subtle.digest(algorithm, encoder.encode(payload)));
}

/**
 * SHA-256 hash of a string.
 *
 * @example
 * ```ts
 * await CryptoHelper.sha256("abc"); // "ba7816bf..."
 * ```
 * @param payload The text to hash (UTF-8).
 * @returns The digest as a lowercase hex string.
 */
export function sha256(payload: string): Promise<string> {
	return digest("SHA-256", payload);
}

/**
 * SHA-512 hash of a string.
 *
 * @param payload The text to hash (UTF-8).
 * @returns The digest as a lowercase hex string.
 */
export function sha512(payload: string): Promise<string> {
	return digest("SHA-512", payload);
}

/**
 * Uniform random float in [0, 1), from the system CSPRNG. Unlike `Math.random()`, it is safe for secrets.
 *
 * @returns A number greater than or equal to 0 and strictly less than 1.
 */
export function secureRandom(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}
