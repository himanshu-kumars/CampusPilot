import { redirect } from "next/navigation";
import { ListingDialogButton, MarketplaceBoard } from "@/components/marketplace";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

export default async function MarketplacePage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Marketplace" subtitle="Buy, sell and lend within your campus." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/marketplace");

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Marketplace"
        subtitle="Buy, sell and lend within your campus."
        action={<ListingDialogButton />}
      />
      <MarketplaceBoard listings={(listings ?? []) as Listing[]} userId={user.id} />
    </>
  );
}
