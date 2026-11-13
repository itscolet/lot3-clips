import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabasePublic } from "@/lib/supabase/server";
import { compact, int, money, money0, PLATFORM_LABEL, shortDate } from "@/lib/format";
import type { Platform, Stats } from "@/lib/types";
import { Card, Progress, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { CountUp, Reveal } from "@/components/ui/motion";
import { ViewsChart } from "@/components/site/views-chart";

export const metadata: Metadata = { title: "Campaign report", robots: { index: false } };

type Report = {
  campaign: { title: string; artist: string | null; status: string; cpm: number; budget: number; platforms: Platform[]; territory: string; starts_at: string | null; created_at: string; is_test: boolean };
  stats: Stats;
  clips: { url: string; platform: Platform; views: number; likes: number; comments: number; shares: number; username: string; created_at: string }[];
  daily: { day: string; views: number }[];
};

export default async function ReportPage({ params }: PageProps<"/report/[token]">) {
  const { token } = await params;
  const { data } = await supabasePublic().rpc("campaign_report", { p_token: token });
  if (!data) notFound();
  const r = data as Report;
  const c = r.campaign;
  const likes = r.clips.reduce((a, x) => a + Number(x.likes), 0);
  const eng = r.stats.total_views ? (likes / r.stats.total_views) * 100 : 0;
  const effCpm = r.stats.total_views ? (Number(r.stats.spent) / r.stats.total_views) * 1000 : 0;

  return (
    <div className="mx-auto max-w-[1100px] px-5 pt-14">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-dim">
          <span className="uppercase tracking-[0.12em]">Campaign report</span>
          <span>·</span>
          <span>Updated live</span>
          {c.is_test && <TestBadge />}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="text-[48px] font-medium leading-none tracking-[-0.045em]">{c.title}</h1>
          <StatusBadge status={c.status} />
        </div>
        <p className="mt-3 text-[14px] text-mute">
          {c.artist ? `${c.artist} · ` : ""}
          {c.platforms.map((p) => PLATFORM_LABEL[p]).join(", ")} · {c.territory === "US" ? "US audiences" : c.territory} · Started {shortDate(c.starts_at ?? c.created_at)}
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {[
            ["Verified views", <CountUp key="v" value={r.stats.total_views} format="compact" />],
            ["Approved clips", <CountUp key="c" value={r.stats.approved} />],
            ["Clippers", <CountUp key="k" value={r.stats.clippers} />],
            ["Like rate", <span key="e" className="num">{eng.toFixed(1)}%</span>],
          ].map(([l, v]) => (
            <div key={l as string} className="bg-black p-6">
              <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{l}</div>
              <div className="mt-2 text-[34px] leading-none">{v}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-5 grid gap-5 md:grid-cols-[1.6fr_1fr]">
        <Reveal delay={0.1}>
          <Card className="h-full p-6">
            <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.1em] text-dim">Views over time</div>
            <ViewsChart data={r.daily.map((d) => ({ x: d.day, y: Number(d.views) }))} />
          </Card>
        </Reveal>
        <Reveal delay={0.12}>
          <Card className="flex h-full flex-col justify-between gap-6 p-6">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-dim">Budget</div>
              <div className="num mt-3 text-[30px]">{money0(r.stats.spent)}</div>
              <div className="text-[13px] text-mute">spent of {money0(c.budget)}</div>
              <Progress value={Number(r.stats.spent)} max={Number(c.budget)} className="mt-4" />
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-line pt-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-dim">Rate</div>
                <div className="num mt-1 text-[16px]">{money(c.cpm)} / 1K</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-dim">Effective CPM</div>
                <div className="num mt-1 text-[16px]">{money(effCpm)}</div>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.14}>
        <Card className="mt-5 overflow-hidden">
          <div className="border-b border-line px-6 py-4 text-[12px] font-medium uppercase tracking-[0.1em] text-dim">
            Clips ({r.clips.length})
          </div>
          {r.clips.length ? (
            <table className="w-full text-[13px]">
              <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-dim">
                <tr className="border-b border-line">
                  <th className="px-6 py-3 font-medium">Clip</th>
                  <th className="font-medium">Clipper</th>
                  <th className="text-right font-medium">Views</th>
                  <th className="text-right font-medium">Likes</th>
                  <th className="text-right font-medium">Comments</th>
                  <th className="px-6 text-right font-medium">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.clips.map((x) => (
                  <tr key={x.url} className="transition-colors hover:bg-s2">
                    <td className="max-w-[320px] px-6 py-3">
                      <a href={x.url} target="_blank" className="flex items-center gap-2.5 truncate text-mute hover:text-ink">
                        <PlatformIcon platform={x.platform} className="size-3.5 shrink-0 text-ink" />
                        <span className="truncate">{x.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                      </a>
                    </td>
                    <td>{x.username}</td>
                    <td className="num text-right">{compact(x.views)}</td>
                    <td className="num text-right text-mute">{compact(x.likes)}</td>
                    <td className="num text-right text-mute">{int(x.comments)}</td>
                    <td className="num px-6 text-right text-dim">{shortDate(x.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-12 text-center text-[13px] text-mute">Clips appear here once approved.</p>
          )}
        </Card>
      </Reveal>
      <p className="mt-6 text-center text-[12px] text-dim">Views are re-checked automatically every few hours. Powered by LOT3 Clips.</p>
    </div>
  );
}
