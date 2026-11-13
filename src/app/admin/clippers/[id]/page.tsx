import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, money, PLATFORM_LABEL, shortDate, timeAgo } from "@/lib/format";
import type { Platform, Profile, SocialAccount } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { KPI, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Avatar, Badge, Card, Empty, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { ReviewButtons } from "@/components/admin/controls";
import { reviewAccount, updateClipper } from "../../actions";

type Sub = { id: string; url: string; platform: Platform; status: string; views: number; earnings: number; created_at: string; campaigns: { id: string; title: string } | null };

export default async function ClipperDetail({ params }: PageProps<"/admin/clippers/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: p }, { data: accs }, { data: subs }, { data: pays }, { data: ps }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    supabase.from("social_accounts").select("*").eq("user_id", id).order("created_at"),
    supabase.from("submissions").select(Q.clipperClips).eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("payouts").select("id,amount,status,reference,created_at,campaigns(title)").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("payout_settings").select("*").eq("user_id", id).maybeSingle(),
  ]);
  if (!p) notFound();
  const accounts = (accs ?? []) as SocialAccount[];
  const rows = (subs ?? []) as unknown as Sub[];
  const approved = rows.filter((r) => r.status === "approved");
  const decided = rows.filter((r) => r.status === "approved" || r.status === "rejected").length;
  const paid = (pays ?? []).filter((x) => x.status === "paid").reduce((a, x) => a + Number(x.amount), 0);
  const btn = "h-8 rounded-full px-3.5 text-[12px] font-medium transition-colors duration-150";
  const signed = new Map<string, string>();
  await Promise.all(
    accounts.map(async (a) => {
      if (!a.audience_screenshot_path) return;
      const { data } = await supabase.storage.from("audience").createSignedUrl(a.audience_screenshot_path, 3600);
      if (data?.signedUrl) signed.set(a.id, data.signedUrl);
    }),
  );

  return (
    <>
      <div className="mb-2 text-[12px] text-dim"><Link href="/admin/clippers" className="hover:text-ink">Clippers</Link> / {p.username}</div>
      <PageHead
        title={
          <span className="flex items-center gap-3">
            <Avatar name={p.username} size={36} /> {p.username}
            <StatusBadge status={p.status} />
            {p.trust !== "normal" && <Badge tone={p.trust === "watch" ? "solid" : "outline"}>{p.trust}</Badge>}
            {p.role === "admin" && <Badge tone="outline">admin</Badge>}
            {p.is_test && <TestBadge />}
          </span>
        }
        sub={`Joined ${shortDate(p.created_at)}${ps ? ` · Pays to ${ps.method}: ${ps.handle}` : " · No payout details"}`}
        action={
          <form action={updateClipper} className="flex flex-wrap gap-1.5">
            <input type="hidden" name="id" value={p.id} />
            {p.trust !== "trusted" && <button name="trust" value="trusted" className={`${btn} border border-line2 text-mute hover:text-ink`}>Mark trusted</button>}
            {p.trust !== "watch" && <button name="trust" value="watch" className={`${btn} border border-line2 text-mute hover:text-ink`}>Watch</button>}
            {p.trust !== "normal" && <button name="trust" value="normal" className={`${btn} border border-line2 text-mute hover:text-ink`}>Reset trust</button>}
            {p.status === "active" ? (
              <button name="status" value="banned" className={`${btn} border border-line2 text-mute hover:bg-ink hover:text-black`}>Ban</button>
            ) : (
              <button name="status" value="active" className={`${btn} bg-ink text-black`}>Unban</button>
            )}
            {p.role === "clipper" ? (
              <button name="role" value="admin" className={`${btn} text-dim hover:text-ink`}>Make admin</button>
            ) : (
              <button name="role" value="clipper" className={`${btn} text-dim hover:text-ink`}>Remove admin</button>
            )}
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-5">
        <KPI label="Clips" value={rows.length} />
        <KPI label="Approval rate" value={decided ? `${Math.round((approved.length / decided) * 100)}%` : "—"} />
        <KPI label="Views" value={compact(approved.reduce((a, r) => a + Number(r.views), 0))} />
        <KPI label="Earned" value={money(approved.reduce((a, r) => a + Number(r.earnings), 0))} />
        <KPI label="Paid" value={money(paid)} />
      </div>

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Connected accounts</h2>
      {accounts.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={a.platform} className="size-4" />
                <a href={a.platform === "tiktok" ? `https://www.tiktok.com/@${a.handle}` : `https://www.instagram.com/${a.handle}/`} target="_blank" className="flex-1 font-medium hover:underline">@{a.handle} ↗</a>
                <span className="text-[12px] text-dim">{PLATFORM_LABEL[a.platform]}{a.followers ? ` · ${compact(a.followers)}` : ""}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <Badge tone={a.verified_at ? "solid" : "outline"}>{a.verified_at ? "Verified" : `Code ${a.verify_code}`}</Badge>
                <Badge tone={a.audience_status === "approved" ? "solid" : "outline"}>US audience: {a.audience_status}{a.us_audience_pct ? ` ${a.us_audience_pct}%` : ""}</Badge>
                {signed.get(a.id) && <a href={signed.get(a.id)} target="_blank" className="text-mute underline underline-offset-2 hover:text-ink">Screenshot ↗</a>}
              </div>
              <form action={reviewAccount} className="flex flex-wrap gap-1.5">
                <input type="hidden" name="id" value={a.id} />
                {a.verified_at ? (
                  <button name="op" value="unverify" className={`${btn} text-dim hover:text-ink`}>Unverify</button>
                ) : (
                  <button name="op" value="verify" className={`${btn} bg-ink text-black`}>Verify</button>
                )}
                {a.audience_status !== "approved" && <button name="op" value="audience_approve" className={`${btn} border border-line2 text-mute hover:text-ink`}>Approve audience</button>}
                {a.audience_status !== "rejected" && <button name="op" value="audience_reject" className={`${btn} text-dim hover:text-ink`}>Reject audience</button>}
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="No accounts connected" />
      )}

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Clips</h2>
      {rows.length ? (
        <Table>
          <THead>
            <Th>Clip</Th>
            <Th>Campaign</Th>
            <Th>Status</Th>
            <Th className="text-right">Views</Th>
            <Th className="text-right">Earned</Th>
            <Th>Submitted</Th>
            <Th className="text-right">Review</Th>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="max-w-[260px]">
                  <a href={r.url} target="_blank" className="flex items-center gap-2 text-mute hover:text-ink">
                    <PlatformIcon platform={r.platform} className="size-3.5 shrink-0 text-ink" />
                    <span className="truncate">{r.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                  </a>
                </Td>
                <Td><Link href={`/admin/campaigns/${r.campaigns?.id}`} className="hover:underline">{r.campaigns?.title}</Link></Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td className="num text-right">{compact(r.views)}</Td>
                <Td className="num text-right">{money(r.earnings)}</Td>
                <Td className="text-[12px] text-dim">{timeAgo(r.created_at)}</Td>
                <Td><div className="flex justify-end"><ReviewButtons id={r.id} status={r.status} compact={false} /></div></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : (
        <Empty title="No clips yet" />
      )}
    </>
  );
}
