import { CryptoHelper } from "../helpers/CryptoHelper.ts";

export class JsonToken {
	constructor(private readonly secret: string) {}

	public async sign(jsonPayload: object): Promise<string> {
		const b64Payload = btoa(JSON.stringify(jsonPayload)).replace(/=+$/, "");
		return `${b64Payload}.${await CryptoHelper.sha256(b64Payload + this.secret)}`;
	}

	public async verify(token: string): Promise<object | null> {
		const parts = token.split(".");
		if (parts.length != 2) return null;

		return await CryptoHelper.sha256(parts[0] + this.secret) == parts[1] ? JSON.parse(atob(parts[0])) : null;
	}
}
