import { assert, assertEquals, assertMatch } from "@std/assert";
import { CryptoHelper } from "@/mod.ts";

Deno.test("sha256", async () => {
	assertEquals(await CryptoHelper.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

Deno.test("sha512", async () => {
	assertMatch(await CryptoHelper.sha512("abc"), /^ddaf35a193617aba/);
});

Deno.test("secureRandom stays in [0, 1)", () => {
	for (let i = 0; i < 1000; i++) {
		const value = CryptoHelper.secureRandom();
		assert(value >= 0 && value < 1);
	}
});
