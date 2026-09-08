/**
 * Regression guard: server components must never CALL functions imported
 * from "use client" modules (Next.js runtime error). cx() lives in lib/cx.ts
 * for exactly this reason.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

let fail = 0;
const bad = (msg) => {
  fail++;
  console.log(`  FAIL ${msg}`);
};

console.log("Import boundary validation\n");

if (!existsSync("lib/cx.ts") || !readFileSync("lib/cx.ts", "utf8").includes("export function cx")) {
  bad("lib/cx.ts must export cx()");
} else {
  console.log("  PASS lib/cx.ts exports cx()");
}

const ui = readFileSync("components/ui.tsx", "utf8");
if (!ui.includes('from "@/lib/cx"')) bad("components/ui.tsx must re-export cx from @/lib/cx");
else console.log("  PASS ui.tsx re-exports cx from lib");

const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
};
walk("app");
walk("components");
walk("lib");

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const isClient = src.includes('"use client"');
  if (isClient) continue;
  // Server file calling cx( must import it from @/lib/cx, never from ui.
  if (/[^.a-zA-Z]cx\(/.test(src)) {
    const uiImport = src.match(/import\s*\{[^}]*\}\s*from\s*["'](@\/components\/ui|\.\/ui)["']/);
    const fromUi = uiImport ? /\bcx\b/.test(uiImport[0]) : false;
    const fromLib = src.includes('from "@/lib/cx"') || (f.endsWith("lib/cx.ts"));
    if (fromUi || !fromLib) bad(`${f}: server code calls cx() but doesn't import it from @/lib/cx`);
  }
  // No "use client" may sneak into lib/ (server actions + pure logic live here).
  if (f.startsWith("lib" + "/") && isClient) bad(`${f}: lib/ files must stay server-safe`);
}

if (fail === 0) console.log("  PASS no server file calls client-module functions");
console.log(fail === 0 ? "\nAll import checks passed" : `\n${fail} import check(s) failed`);
process.exit(fail > 0 ? 1 : 0);
