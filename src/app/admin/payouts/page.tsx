import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";
import { PageHead } from "@/components/site/shell";
import { FilterTabs, KPI, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Empty, LinkButton, StatusBadge, TestBadge } from "@/components/ui/ui";
import { voidPayout } from "../actions";
import { PayRow } from "./pay-row";

export const metadata = { title: "Payouts" };

export type LedgerRow = {
  user_id: string;
  username: string;
  campaign_id: string;
  campaign_title: string;
  campaign_status: string;
  earned: number;
  paid: number;
  owed: number;
  method: string | null;
  handle: string | null;
  is_test: boolean;
};

export default async function PayoutsAdmin({ searchParams }: PageProps<"/admin/payouts">) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "owed";
  const { supabase } = await requireAdmin();
  const [{ data: led }, { data: hist }] = await Promise.all([
    supabase.rpc("payout_ledger", { p_include_test: true }),
    supabase.from("payouts").select(Q.payoutHistory).order("created_at", { ascending: false }).limit(300),
  ]);
  const ledger = (led ?? []) as LedgerRow[];
  const owed = ledger.filter((l) => l.campaign_status === "complete" && Number(l.owed) > 0.004);
  const accruing = ledger.filter((l) => l.campaign_status !== "complete");
  const totalOwed = owed.reduce((a, l) => a + Number(l.owed), 0);
  const totalAccruing = accruing.reduce((a, l) => a + Number(l.owed), 0);
  type H = { id: string; amount: number; method: string | null; reference: string | null; status: string; created_at: string; is_test: boolean; profiles: { id: string; username: string } | null; campaigns: { title: string } | null };
  const history = (hist ?? []) as unknown as H[];
  const totalPaid = history.filter((h) => h.status === "paid").reduce((a, h) => a + Number(h.amount), 0);

  return (
    <>
      <PageHead
        title="Payouts"
        sub="Pay clippers from PayPal, Zelle or Wise, then record it here. Earnings unlock when a campaign is completed."
        action={<LinkButton href="/admin/payouts/export" variant="secondary">Export owed CSV</LinkButton>}
      />
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        <KPI label="Owed now" value={money(totalOwed)} sub={`${owed.length} payouts ready`} />
        <KPI label="Accruing (live)" value={money(totalAccruing)} sub="Unlocks on completion" />
        <KPI label="Paid all time" value={money(totalPaid)} sub={`${history.filter((h) => h.status === "paid").length} payments`} />
      </div>

      <div className="mt-8">
        <FilterTabs
          active={tab}
          tabs={[
            { key: "owed", label: "Owed", count: owed.length, href: "?tab=owed" },
            { key: "accruing", label: "Accruing", count: accruing.length, href: "?tab=accruing" },
            { key: "history", label: "History", count: history.length, href: "?tab=history" },
          ]}
        />
      </div>

      {tab === "owed" &&
        (owed.length ? (
          <Table>
            <THead>
              <Th>Clipper</Th>
              <Th>Campaign</Th>
              <Th>Send to</Th>
              <Th className="text-right">Earned</Th>
              <Th className="text-right">Paid</Th>
              <Th className="text-right">Owed</Th>
              <Th className="text-right">Record payment</Th>
            </THead>
            <TBody>
              {owed.map((l) => <PayRow key={l.user_id + l.campaign_id} l={l} />)}
            </TBody>
          </Table>
        ) : (
          <Empty title="Nobody is owed right now" body="Complete a campaign to unlock its earnings for payout." />
        ))}

      {tab === "accruing" &&
        (accruing.length ? (
          <Table>
            <THead>
              <Th>Clipper</Th>
              <Th>Campaign</Th>
              <Th>Status</Th>
              <Th className="text-right">Earned so far</Th>
            </THead>
            <TBody>
              {accruing.map((l) => (
                <Tr key={l.user_id + l.campaign_id}>
                  <Td><Link href={`/admin/clippers/${l.user_id}`} className="hover:underline">{l.username}</Link></Td>
                  <Td><Link href={`/admin/campaigns/${l.campaign_id}`} className="hover:underline">{l.campaign_title}</Link> {l.is_test && <TestBadge />}</Td>
                  <Td><StatusBadge status={l.campaign_status} /></Td>
                  <Td className="num text-right">{money(l.owed)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        ) : (
          <Empty title="No live earnings yet" />
        ))}

      {tab === "history" &&
        (history.length ? (
          <Table>
            <THead>
              <Th>Date</Th>
              <Th>Clipper</Th>
              <Th>Campaign</Th>
              <Th>Method</Th>
              <Th>Reference</Th>
              <Th className="text-right">Amount</Th>
              <Th>Status</Th>
              <Th />
            </THead>
            <TBody>
              {history.map((h) => (
                <Tr key={h.id} className={h.status === "void" ? "opacity-50" : ""}>
                  <Td className="text-[12px] text-dim">{shortDate(h.created_at)}</Td>
                  <Td><Link href={`/admin/clippers/${h.profiles?.id}`} className="hover:underline">{h.profiles?.username}</Link></Td>
                  <Td className="text-mute">{h.campaigns?.title ?? "—"} {h.is_test && <TestBadge />}</Td>
                  <Td className="text-mute">{h.method ?? "—"}</Td>
                  <Td className="font-mono text-[12px] text-mute">{h.reference ?? "—"}</Td>
                  <Td className="num text-right">{money(h.amount)}</Td>
                  <Td><StatusBadge status={h.status} /></Td>
                  <Td className="text-right">
                    {h.status === "paid" && (
                      <form action={voidPayout}>
                        <input type="hidden" name="id" value={h.id} />
                        <button className="text-[12px] text-dim hover:text-ink">Void</button>
                      </form>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        ) : (
          <Empty title="No payments recorded yet" />
        ))}
    </>
  );
}
