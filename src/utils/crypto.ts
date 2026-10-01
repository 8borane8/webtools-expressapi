type DigestAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export abstract class CryptoHelper {
	private static readonly encoder = new TextEncoder();

	public static async hash(payload: string, algorithm: DigestAlgorithm): Promise<string> {
		const hashBuffer = await crypto.subtle.digest(algorithm, CryptoHelper.encoder.encode(payload));
		const hashArray = Array.from(new Uint8Array(hashBuffer));

		return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
	}

	public static sha512(payload: string): Promise<string> {
		return CryptoHelper.hash(payload, "SHA-512");
	}

	public static sha256(payload: string): Promise<string> {
		return CryptoHelper.hash(payload, "SHA-256");
	}

	public static secureRandom(): number {
		const randomArray = new Uint32Array(1);
		return crypto.getRandomValues(randomArray)[0] / 0xffffffff;
	}
}
