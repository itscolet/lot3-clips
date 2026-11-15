import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHead } from "@/components/site/shell";
import { NewTicketForm } from "@/components/support/new-ticket-form";

export default async function NewSupportPage({ searchParams }: PageProps<"/dashboard/support/new">) {
  const sp = await searchParams;
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const S = t.support;
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,title")
    .in("status", ["live", "paused", "complete"])
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(30);
  return (
    <div className="max-w-[720px]">
      <Link href="/dashboard/support" className="text-[12px] text-mute hover:text-ink">{S.back}</Link>
      <div className="mt-4">
        <PageHead title={S.newMsg} sub={S.listSub} />
      </div>
      <div className="rounded-3xl border border-line bg-s1 p-5 sm:p-7">
        <NewTicketForm username={profile.username} campaigns={campaigns ?? []} defaultCategory={typeof sp.topic === "string" ? sp.topic : "other"} />
      </div>
    </div>
  );
}
