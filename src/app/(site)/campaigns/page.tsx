import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { money0 } from "@/lib/format";
import type { CampaignCard as CC } from "@/lib/types";
import { Reveal } from "@/components/ui/motion";
import { Board } from "./board";

export const metadata: Metadata = { title: "Your invitations" };

export default async function CampaignsPage() {
  const { supabase, profile } = await getSession();
  const [{ data }, { count: verified }] = await Promise.all([
    supabase.rpc("campaign_cards"),
    profile
      ? supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("user_id", profile.id).not("verified_at", "is", null)
      : Promise.resolve({ count: 0 }),
  ]);
  const cards = (data ?? []) as CC[];
  const live = cards.filter((c) => c.status === "live");
  const available = live.reduce((a, c) => a + Math.max(0, Number(c.budget) - Number(c.spent)), 0);
  const name = profile?.display_name ?? profile?.username ?? "";

  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-14">
      <Reveal>
        <div className="grain relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#191919] via-[#0b0b0b] to-black px-7 py-10 md:px-10">
          <div className="relative z-[2] flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-mute">
                <span className="live-dot size-1.5 rounded-full bg-ink" />
                {live.length ? (name ? `${name}, you've been invited` : "You've been invited") : "Invitations"}
              </span>
              <h1 className="mt-4 text-[40px] font-medium leading-[1.02] tracking-[-0.04em] md:text-[52px]">
                {live.length ? (
                  <>
                    You&apos;ve been invited to{" "}
                    <span className="font-serif italic font-normal">
                      {live.length} campaign{live.length === 1 ? "" : "s"}
                    </span>
                  </>
                ) : (
                  <>
                    You&apos;re on the list.{" "}
                    <span className="font-serif italic font-normal">Invites coming soon.</span>
                  </>
                )}
              </h1>
              <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-mute">
                {live.length
                  ? `${money0(available)} in budget is open right now. Pick a campaign, post your clip, and get paid per 1,000 verified views.`
                  : "New invitations land here as campaigns go live. Make sure your page is verified so you're first in."}
              </p>
            </div>
            {!verified && (
              <Link
                href="/dashboard/accounts"
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-line2 bg-black/50 px-5 py-4 text-[13px] transition-colors hover:border-[#555]"
              >
                <span>
                  <span className="block font-medium">Verify your page to accept</span>
                  <span className="text-mute">Takes a minute →</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </Reveal>
      <Board cards={cards} />
    </div>
  );
}
