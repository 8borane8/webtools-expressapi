import * as crypto from "@std/crypto";

export abstract class CryptoHelper {
	private static readonly encoder = new TextEncoder();

	public static async hash(payload: string, algorithm: crypto.DigestAlgorithm): Promise<string> {
		const hashBuffer = await crypto.crypto.subtle.digest(algorithm, CryptoHelper.encoder.encode(payload));
		const hashArray = Array.from(new Uint8Array(hashBuffer));

		return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
	}

	public static md5(payload: string): Promise<string> {
		return CryptoHelper.hash(payload, "MD5");
	}

	public static sha256(payload: string): Promise<string> {
		return CryptoHelper.hash(payload, "SHA-256");
	}

	public static sha512(payload: string): Promise<string> {
		return CryptoHelper.hash(payload, "SHA-512");
	}

	public static secureRandom(): number {
		const randomArray = new Uint32Array(1);
		return crypto.crypto.getRandomValues(randomArray)[0] / 0xffffffff;
	}
}
