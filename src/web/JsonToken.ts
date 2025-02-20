import { CryptoHelper } from "../helpers/CryptoHelper.ts";

export class JsonToken {
	constructor(private readonly secret: string) {}

	// deno-lint-ignore no-explicit-any
	public async sign(jsonPayload: any): Promise<string> {
		const b64Payload = btoa(JSON.stringify(jsonPayload)).replace(/=+$/, "");
		return `${b64Payload}.${await CryptoHelper.sha256(b64Payload + this.secret)}`;
	}

	// deno-lint-ignore no-explicit-any
	public async verify(token: string): Promise<any | null> {
		const parts = token.split(".");
		if (parts.length != 2) return null;

		return await CryptoHelper.sha256(parts[0] + this.secret) == parts[1] ? JSON.parse(atob(parts[0])) : null;
	}
}
