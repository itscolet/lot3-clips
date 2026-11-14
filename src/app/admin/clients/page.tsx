import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { money0 } from "@/lib/format";
import { PageHead } from "@/components/site/shell";
import { Card, Empty, StatusBadge, TestBadge } from "@/components/ui/ui";
import { CopyField } from "@/components/admin/controls";
import { ClientForm } from "./form";

export const metadata = { title: "Clients" };

type C = {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
  is_test: boolean;
  campaigns: { id: string; title: string; status: string; budget: number; report_token: string }[];
};

export default async function ClientsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("clients").select(Q.clients).order("created_at", { ascending: false });
  const clients = (data ?? []) as unknown as C[];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <>
      <PageHead title="Clients" sub="Artists, labels and brands, with each campaign's report link ready to send." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {clients.length ? (
            clients.map((c) => (
              <Card key={c.id} className="min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[15px] font-medium">{c.name} {c.is_test && <TestBadge />}</div>
                    <div className="text-[12px] text-dim">{c.contact ?? "No contact"}{c.notes ? ` · ${c.notes}` : ""}</div>
                  </div>
                  <span className="num shrink-0 text-[13px] text-mute">{money0(c.campaigns.reduce((a, x) => a + Number(x.budget), 0))} total</span>
                </div>
                {c.campaigns.length ? (
                  <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                    {c.campaigns.map((k) => (
                      <div key={k.id} className="flex min-w-0 flex-col gap-2">
                        <div className="flex items-center gap-2 text-[13px]">
                          <Link href={`/admin/campaigns/${k.id}`} className="min-w-0 truncate font-medium hover:underline">{k.title}</Link>
                          <StatusBadge status={k.status} />
                          <span className="num ml-auto text-[12px] text-dim">{money0(k.budget)}</span>
                        </div>
                        <CopyField value={`${site}/report/${k.report_token}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[12px] text-dim">No campaigns yet.</p>
                )}
              </Card>
            ))
          ) : (
            <Empty title="No clients yet" body="Add the artist, label or brand you're running campaigns for." />
          )}
        </div>
        <Card className="h-fit p-5">
          <h3 className="mb-4 text-[14px] font-medium">Add client</h3>
          <ClientForm />
        </Card>
      </div>
    </>
  );
}
