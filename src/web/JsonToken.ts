import { CryptoHelper } from "../helpers/CryptoHelper.ts";

/**
 * A module containing the JsonToken class.
 * @module JsonToken
 */

/**
 * A class for generating and verifying JSON web tokens.
 * @class JsonToken
 */
export  class JsonToken {
	/**
	 * Create a new instance of JsonToken.
	 * @constructor
	 * @param {string} secret - The secret key used to sign and verify tokens.
	 */
	constructor(private readonly secret: string) {}

	/**
	 * Sign a JSON payload and return a signed token.
	 * @method sign
	 * @param {object} jsonPayload - The JSON payload to sign.
	 * @returns {Promise<string>} The signed token.
	 */
	public async sign(jsonPayload: object): Promise<string> {
		const payload = JSON.stringify(jsonPayload);
		const b64Payload = CryptoHelper.b64encode(payload).replace(/=+$/, "");

		const hash = await CryptoHelper.sha256(b64Payload + this.secret);

		return `${b64Payload}.${hash}`;
	}

	/**
	 * Verify a signed token and return the original JSON payload if valid.
	 * @method verify
	 * @param {string} token - The signed token to verify.
	 * @returns {Promise<any | null>} The original JSON payload if the token is valid, null otherwise.
	 */
	// deno-lint-ignore no-explicit-any
	public async verify(token: string): Promise<any | null> {
		const [b64Payload, hash] = token.split(".");

		if (b64Payload == undefined || hash == undefined) {
			return null;
		}

		if (await CryptoHelper.sha256(b64Payload + this.secret) == hash) {
			const payload = CryptoHelper.b64decode(b64Payload);
			return JSON.parse(payload);
		}

		return null;
	}
}
