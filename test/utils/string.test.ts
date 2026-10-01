import { assertEquals, assertMatch } from "@std/assert";
import { StringHelper } from "@/mod.ts";

Deno.test("generateRandomString follows the pattern", () => {
	assertMatch(StringHelper.generateRandomString(), /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
	assertMatch(StringHelper.generateRandomString("ID-XXX", "ab"), /^ID-[ab]{3}$/);
});

Deno.test("escapeHtml", () => {
	assertEquals(StringHelper.escapeHtml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
});

Deno.test("unescapeHtml reverts escapeHtml without double decoding", () => {
	const raw = `<a href="x">&lt; & '</a>`;

	assertEquals(StringHelper.unescapeHtml(StringHelper.escapeHtml(raw)), raw);
	assertEquals(StringHelper.unescapeHtml("&amp;lt;"), "&lt;");
});

Deno.test("slugify and clean", () => {
	assertEquals(StringHelper.slugify("  Cr\u00e8me br\u00fbl\u00e9e & Co_2! "), "creme-brulee-co-2");
	assertEquals(StringHelper.clean("  a \n\t b   c "), "a b c");
});
