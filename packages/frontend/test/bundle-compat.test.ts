import { describe, expect, it } from "vitest";

// The cards are loaded by whatever browser the dashboard happens to be open
// in — wall-mounted Fire tablets, older iPads, embedded WebViews — not just
// the one they were developed on. Syntax those engines cannot parse is a
// whole-bundle failure ("Custom element doesn't exist"), so guard the
// committed bundle rather than trusting the build config to stay put.
import BUNDLE from "../../../custom_components/auto_cal/www/auto-cal-cards.js?raw";

/** Syntax and runtime methods newer than the ES2015 build target. */
const FORBIDDEN_JS: Array<[string, string]> = [
  ["??=", "logical assignment (ES2021)"],
  ["||=", "logical assignment (ES2021)"],
  ["&&=", "logical assignment (ES2021)"],
  ["?.", "optional chaining (ES2020)"],
  ["??", "nullish coalescing (ES2020)"],
  [".flat(", "Array.prototype.flat (ES2019)"],
  [".flatMap(", "Array.prototype.flatMap (ES2019)"],
  [".replaceAll(", "String.prototype.replaceAll (ES2021)"],
  ["structuredClone(", "structuredClone (2022)"],
  ["Object.hasOwn(", "Object.hasOwn (ES2022)"],
];

/** CSS that must sit behind an `@supports` guard, with a plain fallback. */
const GUARDED_CSS = ["color-mix(", "clamp(", "aspect-ratio:", ":has("];

describe("the committed card bundle", () => {
  it.each(FORBIDDEN_JS)("does not use %s — %s", (token) => {
    expect(BUNDLE).not.toContain(token);
  });

  it.each(GUARDED_CSS)("only uses %s behind an @supports guard", (token) => {
    let from = 0;
    for (;;) {
      const at = BUNDLE.indexOf(token, from);
      if (at === -1) break;
      // The guard is emitted a few dozen characters ahead of the declaration.
      expect(BUNDLE.slice(Math.max(0, at - 200), at)).toContain("@supports");
      from = at + token.length;
    }
  });

  it("is built from the current version", () => {
    expect(BUNDLE.startsWith("/*! auto-cal Lovelace cards")).toBe(true);
  });
});
