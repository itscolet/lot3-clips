import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, money } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { tStatus, timeAgoL } from "@/lib/i18n/dict";
import type { Platform, SubmissionStatus } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { Card, Empty, LinkButton, StatusBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { CountUp } from "@/components/ui/motion";

type Row = {
  id: string;
  url: string;
  platform: Platform;
  status: SubmissionStatus;
  views: number;
  earnings: number;
  reject_reason: string | null;
  created_at: string;
  campaigns: { title: string; slug: string; cpm: number; status: string } | null;
};

export default async function DashboardHome() {
  const [{ supabase, profile }, { lang, t }] = await Promise.all([requireUser(), getT()]);
  const D = t.dash;
  const [{ data: bal }, { data: subs }, { count: accCount }, { data: cards }] = await Promise.all([
    supabase.rpc("my_balance").single<{ pending: number; available: number; paid: number }>(),
    supabase
      .from("submissions")
      .select(Q.myClips)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.rpc("campaign_cards"),
  ]);
  const invites = ((cards ?? []) as { status: string; title: string }[]).filter((c) => c.status === "live");
  const rows = (subs ?? []) as unknown as Row[];
  const views = rows.filter((r) => r.status === "approved").reduce((a, r) => a + Number(r.views), 0);
  const b = bal ?? { pending: 0, available: 0, paid: 0 };

  return (
    <>
      <PageHead
        title={D.hey(profile.display_name ?? profile.username)}
        sub={D.sub}
        action={<LinkButton href="/campaigns">{t.common.yourInvitations}</LinkButton>}
      />

      <Link
        href="/campaigns"
        className="grain group relative mb-6 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-[#181818] to-s1 p-5 transition-colors hover:border-[#3a3a3a]"
      >
        <div className="relative z-[2]">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-mute">
            <span className="live-dot size-1.5 rounded-full bg-ink" /> {D.invitations}
          </div>
          <div className="mt-1.5 text-[18px] font-medium tracking-[-0.02em]">
            {invites.length ? D.invited(invites.length) : D.empty}
          </div>
          {invites.length > 0 && <div className="mt-0.5 truncate text-[13px] text-mute">{invites.slice(0, 3).map((c) => c.title).join(" · ")}{invites.length > 3 ? " · …" : ""}</div>}
        </div>
        <span className="relative z-[2] text-mute transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink">→</span>
      </Link>

      {!accCount && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-ink/25 bg-gradient-to-r from-[#141414] to-s1 p-5">
          <div>
            <div className="text-[14px] font-medium">{D.connectTitle}</div>
            <div className="text-[13px] text-mute">{D.connectSub}</div>
          </div>
          <LinkButton href="/dashboard/accounts">{t.common.connectAccount}</LinkButton>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        {[
          [t.common.pending, <CountUp key="p" value={Number(b.pending)} format="money" />, D.pendingSub],
          [t.common.available, <CountUp key="a" value={Number(b.available)} format="money" />, D.availableSub],
          [t.common.paidOut, <CountUp key="o" value={Number(b.paid)} format="money" />, D.paidSub],
          [D.verifiedViews, <CountUp key="v" value={views} format="compact" />, D.approvedClips(rows.filter((r) => r.status === "approved").length)],
        ].map(([l, v, s]) => (
          <div key={l as string} className="bg-s1 p-4 md:p-6">
            <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{l}</div>
            <div className="mt-2.5 text-[22px] leading-none md:text-[28px]">{v}</div>
            <div className="mt-2 text-[12px] text-mute">{s}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">{D.yourClips}</h2>
      {rows.length > 0 && (
        <div className="flex flex-col gap-2 md:hidden">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-s1 p-4">
              <div className="flex items-center justify-between gap-3">
                <a href={r.url} target="_blank" className="flex min-w-0 items-center gap-2 text-[13px] text-mute">
                  <PlatformIcon platform={r.platform} className="size-4 shrink-0 text-ink" />
                  <span className="truncate">{r.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                </a>
                <StatusBadge status={r.status} label={tStatus(t, r.status)} />
              </div>
              {r.campaigns && (
                <Link href={`/campaigns/${r.campaigns.slug}`} className="mt-2 block text-[14px] font-medium">{r.campaigns.title}</Link>
              )}
              {r.reject_reason && <div className="mt-1 text-[12px] text-dim">{r.reject_reason}</div>}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[11px] text-dim">
                <div><div className="num text-[15px] text-ink">{compact(r.views)}</div>{t.common.views}</div>
                <div><div className="num text-[15px] text-ink">{money(r.earnings)}</div>{t.common.earned}</div>
                <div className="text-right"><div className="text-[12px] text-mute">{timeAgoL(r.created_at, lang)}</div>{t.common.submitted}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {rows.length ? (
        <Card className="hidden overflow-hidden md:block">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line bg-s2 text-left text-[11px] uppercase tracking-[0.08em] text-dim">
              <tr>
                <th className="px-5 py-3 font-medium">{D.clip}</th>
                <th className="font-medium">{D.campaign}</th>
                <th className="font-medium">{D.status}</th>
                <th className="text-right font-medium">{t.common.viewsCol}</th>
                <th className="px-5 text-right font-medium">{t.common.earnedCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-s2">
                  <td className="max-w-[260px] px-5 py-3">
                    <a href={r.url} target="_blank" className="flex items-center gap-2.5 text-mute hover:text-ink">
                      <PlatformIcon platform={r.platform} className="size-3.5 shrink-0 text-ink" />
                      <span className="truncate">{r.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                    </a>
                    <div className="mt-0.5 pl-6 text-[11px] text-dim">{timeAgoL(r.created_at, lang)}</div>
                  </td>
                  <td>
                    {r.campaigns && (
                      <Link href={`/campaigns/${r.campaigns.slug}`} className="hover:underline">{r.campaigns.title}</Link>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} label={tStatus(t, r.status)} />
                    {r.reject_reason && <div className="mt-1 max-w-[200px] text-[11px] text-dim">{r.reject_reason}</div>}
                  </td>
                  <td className="num text-right">{compact(r.views)}</td>
                  <td className="num px-5 text-right">{money(r.earnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Empty title={D.noClips} body={D.noClipsSub} action={<LinkButton href="/campaigns" variant="secondary">{D.seeInvites}</LinkButton>} />
      )}
    </>
  );
}
