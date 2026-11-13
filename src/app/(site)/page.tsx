import Link from "next/link";
import { supabasePublic } from "@/lib/supabase/server";
import type { CampaignCard as CC } from "@/lib/types";
import { CampaignCard } from "@/components/site/campaign-card";
import { ActivityTable, ActivityTicker, type ActivityRow } from "@/components/site/activity";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { LinkButton, SectionTitle, Card } from "@/components/ui/ui";


export default async function Home() {
  const sb = supabasePublic();
  const [{ data: cards }, { data: stats }, { data: activity }] = await Promise.all([
    sb.rpc("campaign_cards"),
    sb.rpc("platform_stats").single(),
    sb.rpc("recent_activity", { p_limit: 14 }),
  ]);
  const all = (cards ?? []) as CC[];
  const live = all.filter((c) => c.status === "live");
  const done = all.filter((c) => c.status === "complete");
  const s = (stats ?? { total_earned: 0, total_views: 0, clippers: 0, live_campaigns: 0 }) as {
    total_earned: number;
    total_views: number;
    clippers: number;
    live_campaigns: number;
  };
  const rows = (activity ?? []) as ActivityRow[];
  const liveBudget = live.reduce((a, c) => a + Math.max(0, Number(c.budget) - Number(c.spent)), 0);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 0%, #2a2a2a 0%, transparent 60%), radial-gradient(40% 40% at 10% 30%, #161616 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(70% 60% at 50% 30%, #000, transparent)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-20 pt-24 md:pt-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line2 bg-s1/80 px-3 py-1 text-[12px] text-mute">
              <span className="live-dot size-1.5 rounded-full bg-ink" />
              {live.length} live campaign{live.length === 1 ? "" : "s"} · ${Math.round(liveBudget).toLocaleString()} available
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-7 max-w-4xl text-[52px] font-medium leading-[0.98] tracking-[-0.045em] md:text-[88px]">
              Post clips.
              <br />
              <span className="font-serif italic font-normal tracking-[-0.02em] text-mute">Get paid</span> per view.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-mute">
              Pick a campaign from an artist, film or brand. Clip it, post it on your own page, and earn a set rate for
              every 1,000 verified views. No follower minimum on most campaigns.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-9 flex flex-wrap gap-3">
            <LinkButton href="/campaigns" size="lg">
              Browse campaigns
            </LinkButton>
            <LinkButton href="/signup" size="lg" variant="secondary">
              Create account
            </LinkButton>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
              {[
                ["Earned by clippers", <CountUp key="a" value={Number(s.total_earned)} format="money0" />],
                ["Verified views", <CountUp key="b" value={Number(s.total_views)} format="compact" />],
                ["Clippers", <CountUp key="c" value={Number(s.clippers)} />],
                ["Live campaigns", <CountUp key="d" value={Number(s.live_campaigns)} />],
              ].map(([label, node]) => (
                <div key={label as string} className="flex flex-col gap-2 bg-black px-6 py-6">
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-dim">{label}</span>
                  <span className="text-[30px] leading-none">{node}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <ActivityTicker rows={rows} />

      {/* LIVE */}
      <section className="mx-auto max-w-[1240px] px-5 pt-20">
        <SectionTitle
          action={
            <Link href="/campaigns" className="text-[13px] text-mute transition-colors hover:text-ink">
              View all →
            </Link>
          }
        >
          Live campaigns
        </SectionTitle>
        {live.length ? (
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {live.slice(0, 8).map((c) => (
              <StaggerItem key={c.id}>
                <CampaignCard c={c} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Card className="px-6 py-16 text-center text-[14px] text-mute">New campaigns drop soon. Create an account to be first in.</Card>
        )}
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-28">
        <SectionTitle>How it works</SectionTitle>
        <Stagger className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {[
            ["01", "Connect your page", "Add your TikTok or Instagram and verify it with a code in your bio. No passwords."],
            ["02", "Pick a campaign", "Every campaign lists the sound, the creative direction, the rate and the budget left."],
            ["03", "Post and submit", "Post the clip on your page, then paste the link. We review it fast."],
            ["04", "Get paid per view", "Views are tracked automatically. When the campaign wraps, you get paid."],
          ].map(([n, t, b]) => (
            <StaggerItem key={n} className="flex flex-col gap-4 bg-black p-7">
              <span className="num text-[12px] text-dim">{n}</span>
              <span className="text-[18px] font-medium tracking-[-0.02em]">{t}</span>
              <span className="text-[13px] leading-relaxed text-mute">{b}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ACTIVITY */}
      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pt-28 md:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <h2 className="text-[40px] font-medium leading-[1.02] tracking-[-0.04em]">
            Clips going out
            <br />
            <span className="font-serif italic font-normal text-mute">right now.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-mute">
            Every submission is reviewed by a person and every view is re-checked on a schedule. Botted views don&apos;t
            get paid.
          </p>
          <LinkButton href="/leaderboard" variant="secondary" className="mt-7">
            See the leaderboard
          </LinkButton>
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="px-5 py-2">
            <ActivityTable rows={rows.slice(0, 8)} />
          </Card>
        </Reveal>
      </section>

      {done.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-5 pt-28">
          <SectionTitle>Completed</SectionTitle>
          <Stagger className="grid grid-cols-2 gap-4 opacity-80 md:grid-cols-3 lg:grid-cols-4">
            {done.slice(0, 4).map((c) => (
              <StaggerItem key={c.id}>
                <CampaignCard c={c} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* BRANDS CTA */}
      <section className="mx-auto max-w-[1240px] px-5 pt-28">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#1a1a1a] via-[#0b0b0b] to-black px-8 py-16 md:px-14">
            <div className="relative z-[2] flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-dim">For artists, labels & brands</span>
                <h3 className="mt-4 max-w-xl text-[36px] font-medium leading-[1.04] tracking-[-0.035em] md:text-[44px]">
                  Turn a budget into <span className="font-serif italic font-normal">organic reach.</span>
                </h3>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-mute">
                  You set the budget and the rate per 1,000 views. We brief our clippers, review every post and send you a
                  live report.
                </p>
              </div>
              <LinkButton href="mailto:partnerships@lot3media.com" size="lg">
                Launch a campaign
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
