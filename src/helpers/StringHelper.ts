import { CryptoHelper } from "./CryptoHelper.ts";

export abstract class StringHelper {
	public static generateRandomString(
		pattern: string = "XXXX-XXXX-XXXX-XXXX",
		chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
	): string {
		return pattern
			.split("")
			.map((c) => (c == "X" ? chars[Math.floor(CryptoHelper.secureRandom() * chars.length)] : c))
			.join("");
	}
}
