/**
 * Class-name joiner. Lives here (NOT in components/ui.tsx) on purpose:
 * ui.tsx is a "use client" module, and server components may not CALL
 * functions imported from client modules (runtime error). Both server and
 * client code import cx from here.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
