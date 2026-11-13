import type { Metadata } from "next";
import { supabasePublic } from "@/lib/supabase/server";
import type { CampaignCard as CC } from "@/lib/types";
import { Board } from "./board";

export const metadata: Metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const { data } = await supabasePublic().rpc("campaign_cards");
  const cards = (data ?? []) as CC[];
  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-16">
      <h1 className="text-[44px] font-medium tracking-[-0.04em]">Campaigns</h1>
      <p className="mt-2 text-[14px] text-mute">Pick one, post the clip, get paid per 1,000 verified views.</p>
      <Board cards={cards} />
    </div>
  );
}
