import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, money, timeAgo } from "@/lib/format";
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
  const { supabase, profile } = await requireUser();
  const [{ data: bal }, { data: subs }, { count: accCount }] = await Promise.all([
    supabase.rpc("my_balance").single<{ pending: number; available: number; paid: number }>(),
    supabase
      .from("submissions")
      .select(Q.myClips)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);
  const rows = (subs ?? []) as unknown as Row[];
  const views = rows.filter((r) => r.status === "approved").reduce((a, r) => a + Number(r.views), 0);
  const b = bal ?? { pending: 0, available: 0, paid: 0 };

  return (
    <>
      <PageHead
        title={`Hey ${profile.display_name ?? profile.username}`}
        sub="Your clips, views and earnings."
        action={<LinkButton href="/campaigns">Find a campaign</LinkButton>}
      />

      {!accCount && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-ink/25 bg-gradient-to-r from-[#141414] to-s1 p-5">
          <div>
            <div className="text-[14px] font-medium">Connect your first account</div>
            <div className="text-[13px] text-mute">Verify a TikTok or Instagram page to start submitting clips.</div>
          </div>
          <LinkButton href="/dashboard/accounts">Connect account</LinkButton>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        {[
          ["Pending", <CountUp key="p" value={Number(b.pending)} format="money" />, "Live campaigns"],
          ["Available", <CountUp key="a" value={Number(b.available)} format="money" />, "Ready to pay out"],
          ["Paid out", <CountUp key="o" value={Number(b.paid)} format="money" />, "All time"],
          ["Verified views", <CountUp key="v" value={views} format="compact" />, `${rows.filter((r) => r.status === "approved").length} approved clips`],
        ].map(([l, v, s]) => (
          <div key={l as string} className="bg-s1 p-6">
            <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{l}</div>
            <div className="mt-2.5 text-[28px] leading-none">{v}</div>
            <div className="mt-2 text-[12px] text-mute">{s}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Your clips</h2>
      {rows.length ? (
        <Card className="overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line bg-s2 text-left text-[11px] uppercase tracking-[0.08em] text-dim">
              <tr>
                <th className="px-5 py-3 font-medium">Clip</th>
                <th className="font-medium">Campaign</th>
                <th className="font-medium">Status</th>
                <th className="text-right font-medium">Views</th>
                <th className="px-5 text-right font-medium">Earned</th>
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
                    <div className="mt-0.5 pl-6 text-[11px] text-dim">{timeAgo(r.created_at)}</div>
                  </td>
                  <td>
                    {r.campaigns && (
                      <Link href={`/campaigns/${r.campaigns.slug}`} className="hover:underline">{r.campaigns.title}</Link>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
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
        <Empty title="No clips yet" body="Pick a live campaign, post your clip, and paste the link." action={<LinkButton href="/campaigns" variant="secondary">Browse campaigns</LinkButton>} />
      )}
    </>
  );
}
