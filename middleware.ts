import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/attendance",
  "/assignments",
  "/exams",
  "/study-planner",
  "/notes",
  "/practice",
  "/viva",
  "/calendar",
  "/timetable",
  "/groups",
  "/internships",
  "/placement",
  "/marketplace",
  "/fees",
  "/analytics",
  "/settings",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Unconfigured: let pages render setup guidance instead of crashing.
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some(
    (p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(`${p}/`)
  );
  if (isProtected && !user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/assignments/:path*",
    "/exams/:path*",
    "/study-planner/:path*",
    "/notes/:path*",
    "/practice/:path*",
    "/viva/:path*",
    "/calendar/:path*",
    "/timetable/:path*",
    "/groups/:path*",
    "/internships/:path*",
    "/placement/:path*",
    "/marketplace/:path*",
    "/fees/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
