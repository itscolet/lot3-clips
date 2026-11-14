import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { compact, money, money0, timeAgo } from "@/lib/format";
import type { Campaign } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { KPI, MobileCard, MobileList, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Card, LinkButton, Progress, StatusBadge, TestBadge } from "@/components/ui/ui";

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

type Stat = { id: string; spent: number; total_views: number; approved: number; pending: number };

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [{ data: camps }, pending, flags, verify, { data: ledger }, { data: lastSync }, { data: logs }, { data: snaps }] = await Promise.all([
    supabase.from("campaigns").select("*").in("status", ["live", "paused"]).order("created_at", { ascending: false }),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).or("verified_at.is.null,audience_status.eq.pending"),
    supabase.rpc("payout_ledger", { p_include_test: true }),
    supabase.from("sync_runs").select("*").order("id", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("activity_log").select("action,entity,created_at,meta").order("id", { ascending: false }).limit(8),
    supabase.from("view_snapshots").select("submission_id,views,captured_at").gte("captured_at", hoursAgo(48)).order("captured_at"),
  ]);
  const campaigns = (camps ?? []) as Campaign[];
  const stats = new Map<string, Stat>();
  await Promise.all(
    campaigns.map(async (c) => {
      const { data } = await supabase.rpc("campaign_stats", { p_campaign: c.id }).single<Stat>();
      if (data) stats.set(c.id, { ...data, id: c.id });
    }),
  );
  const liveBudget = campaigns.reduce((a, c) => a + Number(c.budget), 0);
  const liveSpent = campaigns.reduce((a, c) => a + Number(stats.get(c.id)?.spent ?? 0), 0);
  const liveViews = campaigns.reduce((a, c) => a + Number(stats.get(c.id)?.total_views ?? 0), 0);
  type L = { owed: number; campaign_status: string };
  const owed = ((ledger ?? []) as L[]).filter((l) => l.campaign_status === "complete").reduce((a, l) => a + Number(l.owed), 0);

  // views gained in last 24h from snapshots
  const per = new Map<string, { first: number; last: number }>();
  const cutoff = new Date(hoursAgo(24)).getTime();
  for (const s of (snaps ?? []) as { submission_id: string; views: number; captured_at: string }[]) {
    const p = per.get(s.submission_id);
    if (new Date(s.captured_at).getTime() < cutoff) per.set(s.submission_id, { first: Number(s.views), last: p?.last ?? Number(s.views) });
    else per.set(s.submission_id, { first: p?.first ?? Number(s.views), last: Number(s.views) });
  }
  const views24 = [...per.values()].reduce((a, v) => a + Math.max(0, v.last - v.first), 0);

  const todo = [
    { n: pending.count ?? 0, label: "clips to review", href: "/admin/review" },
    { n: verify.count ?? 0, label: "accounts to verify", href: "/admin/verification" },
    { n: flags.count ?? 0, label: "open fraud flags", href: "/admin/flags" },
    { n: Math.round(owed * 100) / 100, label: "owed to clippers", href: "/admin/payouts", money: true },
  ];

  return (
    <>
      <PageHead
        title="Overview"
        sub={lastSync ? `Views last synced ${timeAgo(lastSync.finished_at ?? lastSync.started_at)} · ${lastSync.status}` : "Views haven't synced yet"}
        action={
          <>
            <LinkButton href="/admin/test-lab" variant="secondary">Test Lab</LinkButton>
            <LinkButton href="/admin/campaigns/new">New campaign</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        <KPI label="Live budget" value={money0(liveBudget)} sub={`${money0(liveBudget - liveSpent)} left to spend`} />
        <KPI label="Spent (live)" value={money(liveSpent)} sub={`${liveBudget ? ((liveSpent / liveBudget) * 100).toFixed(1) : 0}% of budget`} />
        <KPI label="Views (live)" value={compact(liveViews)} sub={`+${compact(views24)} last 24h`} />
        <KPI label="Effective CPM" value={liveViews ? money((liveSpent / liveViews) * 1000) : "—"} sub="Spend ÷ views × 1,000" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {todo.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group flex items-center justify-between rounded-2xl border border-line bg-s1 px-5 py-4 transition-colors duration-150 hover:border-[#3a3a3a]"
          >
            <span>
              <span className={`num block text-[22px] ${t.n ? "text-ink" : "text-dim"}`}>{t.money ? money(t.n) : t.n}</span>
              <span className="text-[12px] text-mute">{t.label}</span>
            </span>
            <span className="text-dim transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink">→</span>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Live campaign pacing</h2>
      {campaigns.length > 0 && (
        <MobileList>
          {campaigns.map((c) => {
            const st = stats.get(c.id);
            return (
              <MobileCard
                key={c.id}
                href={`/admin/campaigns/${c.id}`}
                title={<span className="flex items-center gap-2">{c.title} {c.is_test && <TestBadge />}</span>}
                sub={`${money(c.cpm)} CPM · ${money0(st?.spent ?? 0)} of ${money0(c.budget)}`}
                right={<StatusBadge status={c.status} />}
                stats={[[compact(st?.total_views ?? 0), "views"], [st?.approved ?? 0, "clips"], [st?.pending ?? 0, "pending"]]}
                footer={<Progress value={Number(st?.spent ?? 0)} max={Number(c.budget)} />}
              />
            );
          })}
        </MobileList>
      )}
      {campaigns.length ? (
        <Table desktopOnly>
          <THead>
            <Th>Campaign</Th>
            <Th>Status</Th>
            <Th className="text-right">CPM</Th>
            <Th className="w-[220px]">Budget</Th>
            <Th className="text-right">Views</Th>
            <Th className="text-right">Clips</Th>
            <Th className="text-right">Pending</Th>
          </THead>
          <TBody>
            {campaigns.map((c) => {
              const st = stats.get(c.id);
              return (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/admin/campaigns/${c.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      {c.title} {c.is_test && <TestBadge />}
                    </Link>
                    <div className="text-[11px] text-dim">{c.artist}</div>
                  </Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td className="num text-right">{money(c.cpm)}</Td>
                  <Td>
                    <div className="flex justify-between text-[11px] text-mute">
                      <span className="num">{money0(st?.spent ?? 0)}</span>
                      <span className="num">{money0(c.budget)}</span>
                    </div>
                    <Progress value={Number(st?.spent ?? 0)} max={Number(c.budget)} className="mt-1.5" />
                  </Td>
                  <Td className="num text-right">{compact(st?.total_views ?? 0)}</Td>
                  <Td className="num text-right">{st?.approved ?? 0}</Td>
                  <Td className="num text-right">{st?.pending ? <span className="text-ink">{st.pending}</span> : <span className="text-dim">0</span>}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <Card className="px-6 py-12 text-center text-[13px] text-mute">
          No live campaigns. <Link href="/admin/campaigns/new" className="text-ink underline underline-offset-4">Create one</Link> or seed demo data in the Test Lab.
        </Card>
      )}

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Recent admin activity</h2>
      <Card className="divide-y divide-line">
        {(logs ?? []).length ? (
          (logs ?? []).map((l, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 text-[13px]">
              <span className="font-mono text-[12px] text-mute">{l.action}</span>
              <span className="text-[12px] text-dim">{timeAgo(l.created_at)}</span>
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-[13px] text-dim">Nothing yet.</p>
        )}
      </Card>
    </>
  );
}
