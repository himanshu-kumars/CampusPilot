import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/entities";
import { ImportExport, ShareManager } from "@/components/sharing";
import { Button, Card, Icon, PageHeader, SetupRequired } from "@/components/ui";
import { ensureProfile, signOut } from "@/lib/actions";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { ShareLink } from "@/lib/types";

export default async function SettingsPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Manage your profile and session." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/settings");
  const profile = await ensureProfile();
  if (!profile) redirect("/login?next=/settings");

  const supabase = await createClient();
  const { data: links } = await supabase
    .from("share_links")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, sharing and data." />
      <div className="grid max-w-3xl gap-4">
        <ProfileForm profile={profile} />
        <ShareManager links={(links ?? []) as ShareLink[]} />
        <Card>
          <h2 className="text-base font-semibold text-ink">Account</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">
            Signed in as <span className="font-medium text-ink">{user.email}</span>
          </p>
          <form action={signOut}>
            <Button variant="secondary" type="submit">
              <Icon name="logout" className="h-4 w-4" />
              Log out
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Icon name="plus" className="h-5 w-5 text-primary" />
            Install CampusPilot
          </h2>
          <p className="mt-1 text-sm text-muted">
            CampusPilot is installable: on mobile open this site in your browser menu and choose
            “Add to Home Screen” (iOS: Share → Add to Home Screen; Android: Install app). It runs
            full-screen like a native app.
          </p>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-ink">Your data</h2>
          <p className="mt-1 text-sm text-muted">
            Your academic data is isolated per account with database Row Level Security — only you
            can read or change it. Attendance figures are estimates from numbers you record, not
            official university records. AI plans are planning aids, not guarantees.
          </p>
        </Card>
      </div>
      <div className="mt-4 max-w-3xl">
        <ImportExport />
      </div>
    </>
  );
}
