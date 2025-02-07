import { crypto } from "@std/crypto";

export abstract class CryptoHelper {
	private static readonly encoder = new TextEncoder();

	public static async sha256(payload: string): Promise<string> {
		const hashBuffer = await crypto.subtle.digest("SHA-256", CryptoHelper.encoder.encode(payload));
		const hashArray = Array.from(new Uint8Array(hashBuffer));

		return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
	}
}
