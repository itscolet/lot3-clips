import { requireAdmin } from "@/lib/auth";
import { apifyConfigured } from "@/lib/apify";
import { timeAgo } from "@/lib/format";
import { PageHead } from "@/components/site/shell";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Badge, Card, Empty, StatusBadge } from "@/components/ui/ui";
import { SyncButton } from "@/components/admin/controls";

export const metadata = { title: "View sync" };

export default async function SyncPage() {
  const { supabase } = await requireAdmin();
  const { data: runs } = await supabase.from("sync_runs").select("*").order("id", { ascending: false }).limit(50);
  const checks = [
    ["Apify token", apifyConfigured(), "APIFY_TOKEN"],
    ["Service key (scheduled sync)", !!process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"],
    ["Cron secret", !!process.env.CRON_SECRET, "CRON_SECRET"],
  ] as const;
  return (
    <>
      <PageHead title="View sync" sub="Pulls TikTok and Instagram views through Apify, then recalculates earnings and raises fraud flags." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 text-[14px] font-medium">Run now</div>
          <SyncButton />
          <p className="mt-3 text-[11px] text-dim">Live sync checks every pending + approved clip in live and paused campaigns. Simulated sync only touches TEST data.</p>
        </Card>
        <Card className="p-5">
          <div className="mb-4 text-[14px] font-medium">Setup</div>
          <div className="flex flex-col divide-y divide-line">
            {checks.map(([l, ok, env]) => (
              <div key={l} className="flex items-center justify-between py-2.5 text-[13px]">
                <span>
                  {l} <span className="ml-1 font-mono text-[11px] text-dim">{env}</span>
                </span>
                <Badge tone={ok ? "solid" : "outline"}>{ok ? "Set" : "Missing"}</Badge>
              </div>
            ))}
            <div className="py-2.5 text-[12px] text-mute">
              Schedule: a Railway cron job calls <span className="font-mono text-ink">POST /api/cron/sync</span> every 6 hours with the cron secret.
            </div>
          </div>
        </Card>
      </div>
      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">History</h2>
      {(runs ?? []).length ? (
        <Table>
          <THead>
            <Th>Run</Th>
            <Th>Trigger</Th>
            <Th>Status</Th>
            <Th className="text-right">Checked</Th>
            <Th className="text-right">Updated</Th>
            <Th className="text-right">Flagged</Th>
            <Th>Duration</Th>
            <Th>When</Th>
            <Th>Notes</Th>
          </THead>
          <TBody>
            {(runs ?? []).map((r) => (
              <Tr key={r.id}>
                <Td className="num text-dim">#{r.id}</Td>
                <Td className="text-mute">{r.trigger}</Td>
                <Td><StatusBadge status={r.status === "ok" ? "approved" : r.status === "running" ? "pending" : "rejected"} /></Td>
                <Td className="num text-right">{r.checked}</Td>
                <Td className="num text-right">{r.updated}</Td>
                <Td className="num text-right">{r.flagged}</Td>
                <Td className="num text-[12px] text-dim">{r.finished_at ? `${((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)}s` : "…"}</Td>
                <Td className="text-[12px] text-dim">{timeAgo(r.started_at)}</Td>
                <Td className="max-w-[280px] truncate text-[11px] text-dim" title={r.error ?? ""}>{r.error ?? ""}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : (
        <Empty title="No syncs yet" />
      )}
    </>
  );
}
