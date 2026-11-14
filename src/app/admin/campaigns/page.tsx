import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, money, money0, shortDate } from "@/lib/format";
import type { Campaign, Stats } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { FilterTabs, MobileCard, MobileList, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Empty, LinkButton, Progress, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformRow } from "@/components/site/campaign-card";

export const metadata = { title: "Campaigns" };

export default async function AdminCampaigns({ searchParams }: PageProps<"/admin/campaigns">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("campaigns").select(Q.campaignsWithClient).order("created_at", { ascending: false });
  const all = (data ?? []) as (Campaign & { clients: { name: string } | null })[];
  const list = status === "all" ? all : all.filter((c) => c.status === status);
  const stats = new Map<string, Stats>();
  await Promise.all(
    list.map(async (c) => {
      const { data: st } = await supabase.rpc("campaign_stats", { p_campaign: c.id }).single<Stats>();
      if (st) stats.set(c.id, st);
    }),
  );
  const count = (s: string) => all.filter((c) => c.status === s).length;

  return (
    <>
      <PageHead title="Campaigns" sub="Create, publish and track every campaign." action={<LinkButton href="/admin/campaigns/new">New campaign</LinkButton>} />
      <FilterTabs
        active={status}
        tabs={[
          { key: "all", label: "All", count: all.length, href: "/admin/campaigns" },
          { key: "live", label: "Live", count: count("live"), href: "?status=live" },
          { key: "draft", label: "Draft", count: count("draft"), href: "?status=draft" },
          { key: "paused", label: "Paused", count: count("paused"), href: "?status=paused" },
          { key: "complete", label: "Complete", count: count("complete"), href: "?status=complete" },
        ]}
      />
      {list.length > 0 && (
        <MobileList>
          {list.map((c) => {
            const st = stats.get(c.id);
            return (
              <MobileCard
                key={c.id}
                href={`/admin/campaigns/${c.id}`}
                title={<span className="flex items-center gap-2">{c.title} {c.is_test && <TestBadge />}</span>}
                sub={`${c.clients?.name ?? "No client"} · ${money(c.cpm)} CPM`}
                right={<StatusBadge status={c.status} />}
                stats={[[money0(st?.spent ?? 0), `of ${money0(c.budget)}`], [compact(st?.total_views ?? 0), "views"], [`${st?.approved ?? 0} / ${st?.pending ?? 0}`, "approved / pending"]]}
                footer={<Progress value={Number(st?.spent ?? 0)} max={Number(c.budget)} />}
              />
            );
          })}
        </MobileList>
      )}
      {list.length ? (
        <Table desktopOnly>
          <THead>
            <Th>Campaign</Th>
            <Th>Client</Th>
            <Th>Status</Th>
            <Th>Platforms</Th>
            <Th className="text-right">CPM</Th>
            <Th className="w-[200px]">Spend</Th>
            <Th className="text-right">Views</Th>
            <Th className="text-right">Approved</Th>
            <Th className="text-right">Pending</Th>
            <Th>Created</Th>
          </THead>
          <TBody>
            {list.map((c) => {
              const st = stats.get(c.id);
              return (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/admin/campaigns/${c.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      {c.title} {c.is_test && <TestBadge />}
                    </Link>
                    <div className="text-[11px] text-dim">/{c.slug}</div>
                  </Td>
                  <Td className="text-mute">{c.clients?.name ?? "—"}</Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td><PlatformRow platforms={c.platforms} /></Td>
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
                  <Td className="num text-right">{st?.pending || <span className="text-dim">0</span>}</Td>
                  <Td className="text-[12px] text-dim">{shortDate(c.created_at)}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <Empty title="No campaigns here" action={<LinkButton href="/admin/campaigns/new" variant="secondary">Create campaign</LinkButton>} />
      )}
    </>
  );
}
