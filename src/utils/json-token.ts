import { decodeBase64Url, encodeBase64Url } from "@std/encoding/base64url";
import type { Schema } from "../validation/base.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Signed tokens for JSON payloads (`payload.signature`, HMAC-SHA256). The payload is only signed, not encrypted: anyone
 * can read it, nobody can alter it without the secret. Tokens never expire on their own; put an expiry in the payload
 * and check it after `verify` if you need one.
 *
 * @example
 * ```ts
 * const tokens = new JsonToken(Deno.env.get("TOKEN_SECRET")!);
 * const token = await tokens.sign({ userId: "42" });
 * const payload = await tokens.verify(token, z.object({ userId: z.string() })); // { userId: "42" } or null
 * ```
 */
export class JsonToken {
	private readonly key: Promise<CryptoKey>;

	/**
	 * Creates a signer/verifier for one secret.
	 *
	 * @param secret The signing secret, keep it out of the code.
	 * @throws {Error} If the secret is empty.
	 */
	constructor(secret: string) {
		if (!secret) throw new Error("JsonToken requires a non-empty secret.");

		this.key = crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign", "verify"],
		);
	}

	/**
	 * Signs a JSON-serializable payload.
	 *
	 * @param jsonPayload The data to embed in the token.
	 * @returns The token.
	 */
	public async sign(jsonPayload: unknown): Promise<string> {
		const payload = encodeBase64Url(JSON.stringify(jsonPayload));
		const signature = await crypto.subtle.sign("HMAC", await this.key, encoder.encode(payload));

		return `${payload}.${encodeBase64Url(signature)}`;
	}

	/**
	 * Checks the signature and returns the payload. Never throws: any problem (bad format, wrong signature, schema
	 * mismatch) gives `null`.
	 *
	 * @param token The token produced by {@linkcode JsonToken.sign}.
	 * @param schema Optional schema the payload must match; its parsed result is returned.
	 * @returns The payload, or `null` if the token is invalid.
	 */
	// deno-lint-ignore no-explicit-any
	public async verify<T = any>(token: string, schema?: Schema<T>): Promise<T | null> {
		try {
			const [payload, signature, ...rest] = token.split(".");
			if (!payload || !signature || rest.length > 0) return null;

			const valid = await crypto.subtle.verify(
				"HMAC",
				await this.key,
				decodeBase64Url(signature),
				encoder.encode(payload),
			);
			if (!valid) return null;

			const data = JSON.parse(decoder.decode(decodeBase64Url(payload)));
			return schema ? schema.parse(data) : data;
		} catch {
			return null;
		}
	}
}
