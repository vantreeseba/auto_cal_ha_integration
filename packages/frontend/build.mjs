// Bundles the Lovelace cards into the integration so Home Assistant can serve
// them as a single static file — see custom_components/auto_cal/frontend.py.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, "custom_components/auto_cal/manifest.json"), "utf8"),
);

const options = {
  entryPoints: [resolve(here, "src/main.ts")],
  outfile: resolve(repoRoot, "custom_components/auto_cal/www/auto-cal-cards.js"),
  bundle: true,
  format: "iife",
  // Deliberately old: the cards must parse in whatever browser the dashboard
  // is open in — wall-mounted Fire tablets, older iPads, embedded WebViews.
  // Anything newer (optional chaining, `??=`) is a syntax error there, which
  // kills the whole bundle, not just one feature.
  target: "es2015",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  banner: {
    js: `/*! auto-cal Lovelace cards — v${manifest.version} — built from packages/frontend, do not edit */`,
  },
  define: {
    __AUTO_CAL_VERSION__: JSON.stringify(manifest.version),
  },
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log(`watching… → ${options.outfile}`);
} else {
  await esbuild.build(options);
  console.log(`built v${manifest.version} → ${options.outfile}`);
}
