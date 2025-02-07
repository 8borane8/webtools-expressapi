export abstract class StringHelper {
	public static generateRandomString(
		pattern: string = "XXXX-XXXX-XXXX-XXXX",
		chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
	): string {
		const array = pattern.split("").map((c) => c == "X" ? chars[Math.floor(Math.random() * chars.length)] : c);
		return array.join("");
	}
}
