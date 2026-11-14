import { requireUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { PageHead } from "@/components/site/shell";
import { Card, Empty } from "@/components/ui/ui";
import { PayoutForm } from "./form";

export default async function PayoutsPage() {
  const { supabase, profile } = await requireUser();
  const [{ data: settings }, { data: bal }, { data: history }] = await Promise.all([
    supabase.from("payout_settings").select("*").eq("user_id", profile.id).maybeSingle(),
    supabase.rpc("my_balance").single<{ pending: number; available: number; paid: number }>(),
    supabase.from("payouts").select("id,amount,method,reference,created_at,campaigns(title)").eq("user_id", profile.id).eq("status", "paid").order("created_at", { ascending: false }),
  ]);
  const b = bal ?? { pending: 0, available: 0, paid: 0 };
  return (
    <>
      <PageHead title="Payouts" sub="Earnings become available when a campaign wraps. We pay out within a few days." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            {[["Pending", b.pending], ["Available", b.available], ["Paid out", b.paid]].map(([l, v]) => (
              <div key={l as string} className="bg-s1 p-4 md:p-5">
                <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{l}</div>
                <div className="num mt-2 text-[17px] md:text-[24px]">{money(v as number)}</div>
              </div>
            ))}
          </div>
          {history?.length ? (
            <Card className="divide-y divide-line">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-5 py-4 text-[13px]">
                  <div>
                    <div>{(h.campaigns as unknown as { title: string } | null)?.title ?? "Payout"}</div>
                    <div className="text-[11px] text-dim">
                      {shortDate(h.created_at)} · {h.method ?? "—"}
                      {h.reference ? ` · ${h.reference}` : ""}
                    </div>
                  </div>
                  <span className="num text-[15px]">{money(h.amount)}</span>
                </div>
              ))}
            </Card>
          ) : (
            <Empty title="No payouts yet" body="Your payout history shows up here." />
          )}
        </div>
        <Card className="h-fit p-5">
          <h3 className="mb-4 text-[14px] font-medium">Where should we send it?</h3>
          <PayoutForm method={settings?.method ?? "paypal"} handle={settings?.handle ?? ""} />
        </Card>
      </div>
    </>
  );
}
