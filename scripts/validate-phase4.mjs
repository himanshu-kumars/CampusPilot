/** Phase 4 validation: XP engine math, static wiring checks, HTTP smoke checks. */
import { readFileSync, existsSync } from "node:fs";

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
};

console.log("Phase 4 validation\n");

// ---- 1. XP engine unit checks (extract pure code from lib/xp.ts) ----
const src = readFileSync("lib/xp.ts", "utf8");
const rulesSrc = src.match(/export const XP_RULES[^=]*= (\{[\s\S]*?\n\};)/)?.[1] ?? "";
const XP_RULES = new Function(`return (${rulesSrc.replace(/;\s*$/, "")})`)();
check("XP_RULES parses", typeof XP_RULES === "object" && XP_RULES !== null);
check("XP_RULES covers new kinds", XP_RULES.class_recorded === 10 && XP_RULES.assignment_completed === 25 && XP_RULES.internship_offer === 50 && XP_RULES.internship_accepted === 100);
check("viva_turn earns 0 (anti-farm)", XP_RULES.viva_turn === 0);

function loadFn(name) {
  const start = src.indexOf(`export function ${name}(`);
  const brace = src.indexOf("{", start);
  let depth = 0;
  let i = brace;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const fn = src
    .slice(start, i + 1)
    .replace("export function", "function")
    .replace(/: (number|string|boolean|void)/g, "");
  return new Function("XP_RULES", "DEFAULT_XP", `${fn}; return ${name};`)(XP_RULES, 5);
}
const xpForLevel = loadFn("xpForLevel");
const levelForXp = loadFn("levelForXp");
const xpForKind = loadFn("xpForKind");
check("level curve thresholds", xpForLevel(1) === 0 && xpForLevel(2) === 100 && xpForLevel(3) === 400 && xpForLevel(5) === 1600);
check("levelForXp mapping", levelForXp(0) === 1 && levelForXp(99) === 1 && levelForXp(100) === 2 && levelForXp(399) === 2 && levelForXp(400) === 3 && levelForXp(1600) === 5);
check("xpForKind default for unknown", xpForKind("something_future") === 5);
check("summarizeXp structure", src.includes("streakDays >= 7") && src.includes("streakDays >= 30") && src.includes("todayXp") && src.includes("byKind"));

// ---- 2. Migration ----
const sql = readFileSync("supabase/migrations/004_phase4.sql", "utf8");
check("004 creates internships with RLS", sql.includes("create table") && sql.includes("public.internships") && sql.includes("enable row level security"));
check("004 has 7-status check", ["wishlist", "applied", "screening", "interview", "offer", "accepted", "rejected"].every((s) => sql.includes(`'${s}'`)));

// ---- 3. Files exist ----
for (const f of [
  "app/(app)/internships/page.tsx",
  "app/offline/page.tsx",
  "public/sw.js",
  "components/internships.tsx",
  "components/widgets.tsx",
  "components/sw-register.tsx",
  "lib/xp.ts",
]) {
  check(`exists ${f}`, existsSync(f));
}

// ---- 4. Wiring ----
const actions = readFileSync("lib/actions.ts", "utf8");
check("internship CRUD actions", ["createInternship", "updateInternship", "setInternshipStatus", "deleteInternship"].every((n) => actions.includes(`export async function ${n}`)));
check("XP event logging hooked", actions.includes('"class_recorded"') && actions.includes('"assignment_completed"') && actions.includes('"internship_offer"'));
const mw = readFileSync("middleware.ts", "utf8");
check("middleware protects /internships", mw.includes('"/internships"') && mw.includes('"/internships/:path*"'));
check("nav links /internships", readFileSync("components/app-shell.tsx", "utf8").includes('"/internships"'));
check("export includes internships", readFileSync("app/api/export/route.ts", "utf8").includes('"internships"'));
check("validation schema", readFileSync("lib/validation.ts", "utf8").includes("export const internshipSchema"));
check("SW serves offline fallback", readFileSync("public/sw.js", "utf8").includes('caches.match("/offline")'));
check("SW registered in prod only", readFileSync("components/sw-register.tsx", "utf8").includes('NODE_ENV !== "production"'));
const dash = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
check("dashboard renders XP + applications widgets", dash.includes("<XpCard events") && dash.includes("<ApplicationsWidget internships"));
const analytics = readFileSync("app/(app)/analytics/page.tsx", "utf8");
check("analytics has XP section + badges", analytics.includes("summarizeXp(") && analytics.includes("xp.badges") && analytics.includes("internship_accepted"));
check("analytics KIND_LABEL covers phase 4", analytics.includes("class_recorded") && analytics.includes("internship_added"));

// ---- 5. HTTP smoke (needs dev server on :3000) ----
const get = async (path) => {
  const res = await fetch(`http://localhost:3000${path}`, { redirect: "manual" });
  await res.arrayBuffer().catch(() => undefined);
  return res;
};
try {
  const i = await get("/internships");
  check("GET /internships -> 307 to login", i.status === 307 && (i.headers.get("location") || "").includes("/login"));
  const o = await get("/offline");
  check("GET /offline -> 200", o.status === 200);
  const sw = await get("/sw.js");
  check("GET /sw.js -> 200", sw.status === 200);
  const m = await get("/manifest.webmanifest");
  check("GET /manifest.webmanifest -> 200", m.status === 200);
} catch (e) {
  check("dev server reachable on :3000", false, String(e));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
