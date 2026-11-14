import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, money, shortDate } from "@/lib/format";
import type { Platform } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { FilterTabs, MobileCard, MobileList, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Avatar, Badge, Empty, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";

export const metadata = { title: "Clippers" };

type P = {
  id: string;
  username: string;
  role: string;
  status: string;
  trust: string;
  is_test: boolean;
  created_at: string;
  social_accounts: { platform: Platform; verified_at: string | null; audience_status: string }[];
  submissions: { status: string; views: number; earnings: number }[];
};

export default async function ClippersPage({ searchParams }: PageProps<"/admin/clippers">) {
  const sp = await searchParams;
  const filter = typeof sp.f === "string" ? sp.f : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("profiles")
    .select(Q.clippers)
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) query = query.ilike("username", `%${q}%`);
  const { data } = await query;
  let rows = (data ?? []) as unknown as P[];
  const counts = {
    all: rows.length,
    watch: rows.filter((r) => r.trust === "watch").length,
    banned: rows.filter((r) => r.status === "banned").length,
    unverified: rows.filter((r) => !r.social_accounts.some((a) => a.verified_at)).length,
  };
  if (filter === "watch") rows = rows.filter((r) => r.trust === "watch");
  if (filter === "banned") rows = rows.filter((r) => r.status === "banned");
  if (filter === "unverified") rows = rows.filter((r) => !r.social_accounts.some((a) => a.verified_at));

  return (
    <>
      <PageHead
        title="Clippers"
        sub="Everyone who's signed up, with their accounts, output and earnings."
        action={
          <form className="flex w-full gap-2 md:w-auto">
            <input name="q" defaultValue={q} placeholder="Search username" className="h-10 w-full rounded-full border border-line2 bg-s1 px-4 text-[16px] md:h-9 md:w-56 md:text-[12px] outline-none placeholder:text-dim focus:border-[#555]" />
          </form>
        }
      />
      <FilterTabs
        active={filter}
        tabs={[
          { key: "all", label: "All", count: counts.all, href: "?f=all" },
          { key: "unverified", label: "No verified account", count: counts.unverified, href: "?f=unverified" },
          { key: "watch", label: "Watch list", count: counts.watch, href: "?f=watch" },
          { key: "banned", label: "Banned", count: counts.banned, href: "?f=banned" },
        ]}
      />
      {rows.length > 0 && (
        <MobileList>
          {rows.map((r) => {
            const appr = r.submissions.filter((s) => s.status === "approved");
            return (
              <MobileCard
                key={r.id}
                href={`/admin/clippers/${r.id}`}
                title={<span className="flex items-center gap-2">{r.username} {r.role === "admin" && <Badge tone="outline">admin</Badge>} {r.is_test && <TestBadge />}</span>}
                sub={<span className="flex items-center gap-2">{r.social_accounts.length ? r.social_accounts.map((a, i) => <span key={i} className={a.verified_at ? "text-ink" : "text-dim"}><PlatformIcon platform={a.platform} /></span>) : "No accounts"} · joined {shortDate(r.created_at)}</span>}
                right={r.trust !== "normal" ? <Badge tone={r.trust === "watch" ? "solid" : "outline"}>{r.trust}</Badge> : <StatusBadge status={r.status} />}
                stats={[[appr.length, "approved"], [compact(appr.reduce((a, s) => a + Number(s.views), 0)), "views"], [money(appr.reduce((a, s) => a + Number(s.earnings), 0)), "earned"]]}
              />
            );
          })}
        </MobileList>
      )}
      {rows.length ? (
        <Table desktopOnly>
          <THead>
            <Th>Clipper</Th>
            <Th>Accounts</Th>
            <Th className="text-right">Approved</Th>
            <Th className="text-right">Approval rate</Th>
            <Th className="text-right">Views</Th>
            <Th className="text-right">Earned</Th>
            <Th>Status</Th>
            <Th>Joined</Th>
          </THead>
          <TBody>
            {rows.map((r) => {
              const appr = r.submissions.filter((s) => s.status === "approved");
              const decided = r.submissions.filter((s) => s.status === "approved" || s.status === "rejected").length;
              return (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/admin/clippers/${r.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
                      <Avatar name={r.username} size={26} />
                      {r.username}
                      {r.role === "admin" && <Badge tone="outline">admin</Badge>}
                      {r.is_test && <TestBadge />}
                    </Link>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      {r.social_accounts.length ? (
                        r.social_accounts.map((a, i) => (
                          <span key={i} className={a.verified_at ? "text-ink" : "text-dim"} title={a.verified_at ? "Verified" : "Unverified"}>
                            <PlatformIcon platform={a.platform} />
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-dim">—</span>
                      )}
                    </span>
                  </Td>
                  <Td className="num text-right">{appr.length}</Td>
                  <Td className="num text-right text-mute">{decided ? `${Math.round((appr.length / decided) * 100)}%` : "—"}</Td>
                  <Td className="num text-right">{compact(appr.reduce((a, s) => a + Number(s.views), 0))}</Td>
                  <Td className="num text-right">{money(appr.reduce((a, s) => a + Number(s.earnings), 0))}</Td>
                  <Td>
                    <span className="flex gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.trust !== "normal" && <Badge tone={r.trust === "watch" ? "solid" : "outline"}>{r.trust}</Badge>}
                    </span>
                  </Td>
                  <Td className="text-[12px] text-dim">{shortDate(r.created_at)}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <Empty title="No clippers found" />
      )}
    </>
  );
}
