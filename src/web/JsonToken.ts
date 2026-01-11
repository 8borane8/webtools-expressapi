import { CryptoHelper } from "../helpers/CryptoHelper.ts";
import { StringHelper } from "../helpers/StringHelper.ts";

export class JsonToken {
	constructor(private readonly secret: string) {}

	private constantTimeCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}

		return result === 0;
	}

	public async sign(jsonPayload: unknown): Promise<string> {
		const payloadString = JSON.stringify(jsonPayload);
		const encodedPayload = StringHelper.encodeBase64Url(payloadString);

		const dataToSign = encodedPayload + this.secret;
		const signature = await CryptoHelper.sha256(dataToSign);

		return `${encodedPayload}.${signature}`;
	}

	// deno-lint-ignore no-explicit-any
	public async verify<T = any>(token: string): Promise<T | null> {
		try {
			const [payload, signature] = token.split(".");
			if (!payload || !signature) return null;

			const dataToVerify = payload + this.secret;
			const expectedSignature = await CryptoHelper.sha256(dataToVerify);

			if (!this.constantTimeCompare(signature, expectedSignature)) {
				return null;
			}

			const decodedPayload = StringHelper.decodeBase64Url(payload);
			return JSON.parse(decodedPayload) as T;
		} catch {
			return null;
		}
	}
}
