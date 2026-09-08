/** Phase 6 validation: marketplace, fee tracker + OCR, feedback replies. */
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

console.log("Phase 6 validation\n");

// ---- 1. Migration ----
const sql = readFileSync("supabase/migrations/006_phase6.sql", "utf8");
check("006 creates listings (browse for authenticated)", sql.includes("public.listings") && sql.includes("Students browse listings") && sql.includes("to authenticated"));
check("006 creates fees with owner RLS", sql.includes("public.fees") && sql.includes("Users manage own fees"));
check("006 adds reply columns + thread RPC", sql.includes("add column if not exists reply") && sql.includes("get_share_feedback") && sql.includes("security definer"));
check("006 adds owner UPDATE policy for replies", sql.includes("Owners reply on own link feedback"));

// ---- 2. Actions + XP ----
const actions = readFileSync("lib/actions.ts", "utf8");
check("listing CRUD actions", ["createListing", "updateListing", "setListingStatus", "deleteListing"].every((n) => actions.includes(`export async function ${n}`)));
check("fee CRUD actions", ["createFee", "updateFee", "setFeeStatus", "deleteFee"].every((n) => actions.includes(`export async function ${n}`)));
check("reply + XP logging", actions.includes("replyToFeedback") && actions.includes('"listing_created"') && actions.includes('"fee_paid"'));
check("XP rules + labels cover phase 6", readFileSync("lib/xp.ts", "utf8").includes("listing_created") && readFileSync("app/(app)/analytics/page.tsx", "utf8").includes("fee_paid"));

// ---- 3. OCR ----
const fees = readFileSync("components/fees.tsx", "utf8");
check("OCR is dynamic import (no bundle bloat)", fees.includes('await import("tesseract.js")'));
check("OCR parses amount + date + never throws", fees.includes("parseAmount") && fees.includes("parseDate") && fees.includes("Never throws"));
check("OCR asks user to verify", fees.includes("Please verify") || fees.includes("Always verify"));
check("tesseract.js installed", JSON.parse(readFileSync("package.json", "utf8").replace(/\/\/.*/g, "")).dependencies["tesseract.js"] !== undefined);

// ---- 4. Replies wiring ----
check("ShareManager has reply box", readFileSync("components/sharing.tsx", "utf8").includes("ReplyBox") && readFileSync("components/sharing.tsx", "utf8").includes("replyToFeedback"));
check("share page renders discussion thread", readFileSync("app/share/[token]/page.tsx", "utf8").includes("get_share_feedback"));

// ---- 5. Files + nav ----
for (const f of [
  "app/(app)/marketplace/page.tsx",
  "app/(app)/fees/page.tsx",
  "components/marketplace.tsx",
  "components/fees.tsx",
]) {
  check(`exists ${f}`, existsSync(f));
}
check("nav covers marketplace + fees", readFileSync("components/app-shell.tsx", "utf8").includes('"/marketplace"') && readFileSync("components/app-shell.tsx", "utf8").includes('"/fees"'));
check("middleware protects both", readFileSync("middleware.ts", "utf8").includes('"/marketplace/:path*"') && readFileSync("middleware.ts", "utf8").includes('"/fees/:path*"'));
check("export includes listings + fees", readFileSync("app/api/export/route.ts", "utf8").includes('"listings"') && readFileSync("app/api/export/route.ts", "utf8").includes('"fees"'));
check("dashboard renders fee + marketplace widgets", readFileSync("app/(app)/dashboard/page.tsx", "utf8").includes("<FeesWidget") && readFileSync("app/(app)/dashboard/page.tsx", "utf8").includes("<MarketplaceWidget"));

// ---- 6. HTTP smoke (needs dev server on :3000) ----
try {
  const m = await fetch("http://localhost:3000/marketplace", { redirect: "manual" });
  await m.arrayBuffer().catch(() => undefined);
  check("GET /marketplace -> 307 to login", m.status === 307 && (m.headers.get("location") || "").includes("/login"));
  const f = await fetch("http://localhost:3000/fees", { redirect: "manual" });
  await f.arrayBuffer().catch(() => undefined);
  check("GET /fees -> 307 to login", f.status === 307 && (f.headers.get("location") || "").includes("/login"));
} catch (e) {
  check("dev server reachable on :3000", false, String(e));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
