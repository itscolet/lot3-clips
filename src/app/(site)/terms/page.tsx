import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & rules" };

const sections: [string, string[]][] = [
  ["What LOT3 Clips is", [
    "LOT3 Clips is a performance marketplace run by LOT3 Media LLC. Brands, artists and labels fund campaigns. Clippers post content that follows each campaign brief and earn a set rate per 1,000 verified views (CPM).",
    "LOT3 Clips does not guarantee earnings for clippers or results for brands.",
  ]],
  ["Eligibility", [
    "You must be at least 18, or 13–17 with a parent or guardian's permission and their acceptance of financial responsibility.",
    "One person, one LOT3 Clips account. You may connect multiple social accounts that you own and control.",
    "You verify ownership of each social account by placing a one-time code in its bio. We never ask for social media passwords.",
  ]],
  ["Posting rules", [
    "Follow every rule in the campaign brief and the community guidelines of the platform you post on.",
    "Post from your own connected account. Keep each clip live for at least 30 days after the campaign ends.",
    "Use only content you have the right to use, plus the materials the campaign provides. Add disclosures (#ad, paid partnership) when the brief or law requires.",
    "If we or the campaign owner ask you to edit or remove a clip, do it within 24 hours. Views verified before the request still count.",
  ]],
  ["Verified views & fraud", [
    "Earnings are based only on views we verify. Our tracking is the source of truth.",
    "Bots, view farms, purchased engagement, coordinated manipulation, re-uploading the same clip, or misreporting your audience location are prohibited.",
    "Suspicious activity can be held for review. Confirmed fraud means the affected earnings are voided and the account is banned. You may appeal once with evidence; our decision on appeal is final.",
    "US-only campaigns pay only for accounts with an approved audience screenshot showing a majority US audience.",
  ]],
  ["Earnings & payouts", [
    "Earnings = verified views ÷ 1,000 × campaign CPM, subject to any per-clip cap. If approved views exceed the campaign budget, earnings are shared pro rata so total payouts never exceed the budget.",
    "Earnings show as pending while a campaign is live and become available once it is marked complete.",
    "Payouts are sent to the PayPal, Wise, Zelle, Venmo or Cash App details in your dashboard. You're responsible for accurate payout details and for your own taxes. We may request a W-9 or W-8 before paying.",
    "No off-platform deals with campaign owners that bypass LOT3 Clips.",
  ]],
  ["Content license", [
    "You grant the campaign owner and LOT3 Media a worldwide, royalty-free, perpetual license to repost, edit and use submitted clips for marketing.",
    "You keep ownership of your content.",
  ]],
  ["Accounts", [
    "We may suspend or close accounts that break these rules or put the platform, brands or other clippers at risk.",
    "We may update these terms and campaign rules. Continued use means you accept the update.",
  ]],
  ["Contact", ["partnerships@lot3media.com"]],
];

export default function Terms() {
  return (
    <div className="mx-auto max-w-[760px] px-5 pt-16">
      <h1 className="text-[44px] font-medium tracking-[-0.04em]">Terms & rules</h1>
      <p className="mt-2 text-[13px] text-dim">Last updated November 2026</p>
      <div className="mt-12 flex flex-col gap-12">
        {sections.map(([t, ps], i) => (
          <section key={t} className="grid gap-4 md:grid-cols-[48px_1fr]">
            <span className="num text-[12px] text-dim">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-[18px] font-medium tracking-[-0.02em]">{t}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {ps.map((p) => (
                  <p key={p} className="text-[14px] leading-relaxed text-mute">{p}</p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
