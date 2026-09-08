/**
 * PostgREST error helpers. Lives here (NOT in lib/actions.ts) because
 * "use server" modules may only export async functions — a sync export
 * breaks the production build.
 */

/** True when a PostgREST error means "table doesn't exist" (migrations not run). */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  const message = String((err as { message?: unknown }).message ?? "");
  return (
    code === "PGRST205" ||
    /could not find the table|schema cache|relation .* does not exist/i.test(message)
  );
}
