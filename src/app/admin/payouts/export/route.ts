import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();
  const { data: admin } = await sb.rpc("is_admin");
  if (admin !== true) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await sb.rpc("payout_ledger", { p_include_test: false });
  type L = { username: string; campaign_title: string; campaign_status: string; earned: number; paid: number; owed: number; method: string | null; handle: string | null };
  const rows = ((data ?? []) as L[]).filter((l) => l.campaign_status === "complete" && Number(l.owed) > 0.004);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["username", "campaign", "method", "send_to", "earned", "paid", "owed"].join(","),
    ...rows.map((r) => [r.username, r.campaign_title, r.method, r.handle, Number(r.earned).toFixed(2), Number(r.paid).toFixed(2), Number(r.owed).toFixed(2)].map(esc).join(",")),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lot3-clips-owed-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
