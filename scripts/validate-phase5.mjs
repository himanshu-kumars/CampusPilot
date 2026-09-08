/** Phase 5 validation: placement prep, mentor feedback, push reminders. */
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

console.log("Phase 5 validation\n");

// ---- 1. Migration ----
const sql = readFileSync("supabase/migrations/005_phase5.sql", "utf8");
check("005 creates share_feedback with owner RLS", sql.includes("share_feedback") && sql.includes("Owners read own link feedback") && sql.includes("Owners delete own link feedback"));
check("005 has token-checked feedback RPC", sql.includes("submit_share_feedback") && sql.includes("security definer") && sql.includes("invalid or expired"));
check("005 creates push_subscriptions with RLS", sql.includes("push_subscriptions") && sql.includes("Users manage own push subscriptions"));

// ---- 2. Placement ----
const val = readFileSync("lib/validation.ts", "utf8");
check("10 placement tracks defined", (val.match(/"(quant|logical|verbal|dsa|oops|dbms|os|cn|hr|puzzles)"/g) || []).length >= 10);
check("questions schema accepts track", val.includes("track: z") && val.includes("d.noteId || d.track"));
const qroute = readFileSync("app/api/ai/questions/route.ts", "utf8");
check("questions route handles track", qroute.includes("input.track") && qroute.includes("Placement preparation track"));
check("placement reuses QuizRunner", readFileSync("components/placement.tsx", "utf8").includes("QuizRunner") && readFileSync("components/practice.tsx", "utf8").includes("export function QuizRunner"));

// ---- 3. Feedback wiring ----
check("feedback API validates + calls RPC", readFileSync("app/api/share/[token]/feedback/route.ts", "utf8").includes("submit_share_feedback") && readFileSync("app/api/share/[token]/feedback/route.ts", "utf8").includes("feedbackSchema"));
check("share page renders feedback form", readFileSync("app/share/[token]/page.tsx", "utf8").includes("<ShareFeedbackForm token={token}"));
check("settings shows + deletes feedback", readFileSync("app/(app)/settings/page.tsx", "utf8").includes("share_feedback") && readFileSync("lib/actions.ts", "utf8").includes("deleteShareFeedback"));

// ---- 4. Push wiring ----
check("vapid-gated push lib", readFileSync("lib/push.ts", "utf8").includes("vapidConfigured") && readFileSync("lib/push.ts", "utf8").includes("gone: true"));
check("subscribe/test routes auth + gate", readFileSync("app/api/push/subscribe/route.ts", "utf8").includes("vapidConfigured()") && readFileSync("app/api/push/test/route.ts", "utf8").includes("You must be logged in"));
const cron = readFileSync("app/api/cron/reminders/route.ts", "utf8");
check("cron checks CRON_SECRET + service role", cron.includes("Bearer ${secret}") && cron.includes("SUPABASE_SERVICE_ROLE_KEY"));
check("cron skips quiet users (no spam)", cron.includes("no spam"));
check("SW handles push + click", readFileSync("public/sw.js", "utf8").includes('addEventListener("push"') && readFileSync("public/sw.js", "utf8").includes('addEventListener("notificationclick"'));
check("settings hosts PushManager", readFileSync("app/(app)/settings/page.tsx", "utf8").includes("<PushManager"));
check("vercel.json daily cron", readFileSync("vercel.json", "utf8").includes("/api/cron/reminders"));

// ---- 5. Files + nav ----
for (const f of [
  "app/(app)/placement/page.tsx",
  "components/placement.tsx",
  "components/push-manager.tsx",
  "lib/push.ts",
  "app/api/share/[token]/feedback/route.ts",
  "app/api/push/subscribe/route.ts",
  "app/api/push/test/route.ts",
  "app/api/cron/reminders/route.ts",
]) {
  check(`exists ${f}`, existsSync(f));
}
check("nav + middleware cover /placement", readFileSync("components/app-shell.tsx", "utf8").includes('"/placement"') && readFileSync("middleware.ts", "utf8").includes('"/placement/:path*"'));

// ---- 6. HTTP smoke (needs dev server on :3000) ----
try {
  const p = await fetch("http://localhost:3000/placement", { redirect: "manual" });
  await p.arrayBuffer().catch(() => undefined);
  check("GET /placement -> 307 to login", p.status === 307 && (p.headers.get("location") || "").includes("/login"));
  const c = await fetch("http://localhost:3000/api/cron/reminders");
  check("GET /api/cron/reminders without secret -> 401/503", c.status === 401 || c.status === 503);
  const s = await fetch("http://localhost:3000/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("POST /api/push/subscribe unauth -> 401/503", s.status === 401 || s.status === 503);
  const f = await fetch("http://localhost:3000/api/share/INVALIDTOKEN123/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author: "", message: "" }) });
  check("POST feedback invalid body -> 400", f.status === 400);
} catch (e) {
  check("dev server reachable on :3000", false, String(e));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
