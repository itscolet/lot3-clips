import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, money, money0, timeAgo } from "@/lib/format";
import type { Campaign, Platform, Stats, SubmissionStatus } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { KPI, MobileCard, MobileList, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { CampaignForm } from "@/components/admin/campaign-form";
import { Tabs } from "@/components/ui/tabs";
import { Card, Empty, LinkButton, Progress, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { CopyField, ConfirmButton, ManualViews, ReviewButtons, SyncButton } from "@/components/admin/controls";
import { deleteCampaign, duplicateCampaign, rotateReportLink, setCampaignStatus } from "../../actions";

type Sub = {
  id: string;
  url: string;
  platform: Platform;
  status: SubmissionStatus;
  views: number;
  likes: number;
  earnings: number;
  reject_reason: string | null;
  last_synced_at: string | null;
  created_at: string;
  is_test: boolean;
  profiles: { id: string; username: string } | null;
  social_accounts: { handle: string; followers: number | null } | null;
};

export default async function CampaignAdmin({ params }: PageProps<"/admin/campaigns/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: c }, { data: st }, { data: subs }, { data: clients }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).maybeSingle<Campaign>(),
    supabase.rpc("campaign_stats", { p_campaign: id }).single<Stats>(),
    supabase
      .from("submissions")
      .select(Q.campaignClips)
      .eq("campaign_id", id)
      .order("views", { ascending: false }),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  if (!c) notFound();
  const stats = st ?? { submitted: 0, approved: 0, pending: 0, rejected: 0, total_views: 0, spent: 0, clippers: 0 };
  const rows = (subs ?? []) as unknown as Sub[];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const effCpm = stats.total_views ? (Number(stats.spent) / stats.total_views) * 1000 : 0;

  const statusBtn = (s: string, label: React.ReactNode, variant: "primary" | "secondary" = "secondary") => (
    <form action={setCampaignStatus}>
      <input type="hidden" name="id" value={c.id} />
      <input type="hidden" name="status" value={s} />
      <button className={`h-10 w-full rounded-full px-4 text-[12px] font-medium md:h-9 md:w-auto transition-colors duration-150 ${variant === "primary" ? "bg-ink text-black hover:bg-white" : "border border-line2 text-mute hover:text-ink"}`}>{label}</button>
    </form>
  );

  const clipsTab = rows.length ? (
    <>
    <MobileList>
      {rows.map((s) => (
        <MobileCard
          key={s.id}
          title={<span className="flex items-center gap-2"><PlatformIcon platform={s.platform} className="size-3.5 shrink-0" />{s.profiles?.username ?? "—"} {s.is_test && <TestBadge />}</span>}
          sub={<a href={s.url} target="_blank" className="hover:text-ink">{s.url.replace(/^https?:\/\/(www\.)?/, "")}</a>}
          right={<StatusBadge status={s.status} />}
          stats={[[compact(s.views), "views"], [compact(s.likes), "likes"], [money(s.earnings), "earned"]]}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-dim">Checked {timeAgo(s.last_synced_at)}</span>
              <div className="flex items-center gap-1.5"><ManualViews id={s.id} views={s.views} likes={s.likes} /><ReviewButtons id={s.id} status={s.status} /></div>
            </div>
          }
        />
      ))}
    </MobileList>
    <Table desktopOnly>
      <THead>
        <Th>Clip</Th>
        <Th>Clipper</Th>
        <Th>Status</Th>
        <Th className="text-right">Views</Th>
        <Th className="text-right">Likes</Th>
        <Th className="text-right">Earned</Th>
        <Th>Checked</Th>
        <Th className="text-right">Actions</Th>
      </THead>
      <TBody>
        {rows.map((s) => (
          <Tr key={s.id}>
            <Td className="max-w-[240px]">
              <a href={s.url} target="_blank" className="flex items-center gap-2 text-mute hover:text-ink">
                <PlatformIcon platform={s.platform} className="size-3.5 shrink-0 text-ink" />
                <span className="truncate">{s.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
              </a>
              {s.reject_reason && <div className="mt-0.5 pl-5 text-[11px] text-dim">{s.reject_reason}</div>}
            </Td>
            <Td>
              {s.profiles && <Link href={`/admin/clippers/${s.profiles.id}`} className="hover:underline">{s.profiles.username}</Link>}
              <div className="text-[11px] text-dim">@{s.social_accounts?.handle}</div>
            </Td>
            <Td><span className="flex items-center gap-1.5"><StatusBadge status={s.status} />{s.is_test && <TestBadge />}</span></Td>
            <Td className="num text-right">{compact(s.views)}</Td>
            <Td className="num text-right text-mute">{compact(s.likes)}</Td>
            <Td className="num text-right">{money(s.earnings)}</Td>
            <Td className="text-[12px] text-dim">{timeAgo(s.last_synced_at)}</Td>
            <Td>
              <div className="flex items-center justify-end gap-1.5">
                <ManualViews id={s.id} views={s.views} likes={s.likes} />
                <ReviewButtons id={s.id} status={s.status} />
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
    </>
  ) : (
    <Empty title="No clips yet" body="Submissions appear here as clippers post." />
  );

  return (
    <>
      <div className="mb-2 text-[12px] text-dim">
        <Link href="/admin/campaigns" className="hover:text-ink">Campaigns</Link> / {c.title}
      </div>
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.title} <StatusBadge status={c.status} /> {c.is_test && <TestBadge />}
          </span>
        }
        sub={`${c.artist ?? ""}${c.artist ? " · " : ""}${money(c.cpm)} CPM · ${c.platforms.join(", ")} · ${c.territory}`}
        action={
          <>
            {c.status !== "live" && statusBtn("live", c.status === "draft" ? "Publish" : "Resume", "primary")}
            {c.status === "live" && statusBtn("paused", "Pause")}
            {c.status !== "complete" && statusBtn("complete", <><span className="md:hidden">Complete</span><span className="max-md:hidden">Complete &amp; unlock payouts</span></>)}
            <LinkButton href={`/campaigns/${c.slug}`} target="_blank" variant="secondary" size="sm" className="h-9">View public ↗</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-5">
        <KPI label="Spent" value={money(stats.spent)} sub={`of ${money0(c.budget)}`} />
        <KPI label="Views" value={compact(stats.total_views)} sub={`Eff. CPM ${money(effCpm)}`} />
        <KPI label="Approved" value={stats.approved} sub={`${stats.clippers} clippers`} />
        <KPI label="Pending" value={stats.pending} sub={<Link href={`/admin/review?campaign=${c.id}`} className="hover:text-ink">Review →</Link>} />
        <KPI label="Denied" value={stats.rejected} />
      </div>
      <Progress value={Number(stats.spent)} max={Number(c.budget)} className="mt-3" />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="min-w-0 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium">Client report link</span>
            <form action={rotateReportLink}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-[12px] text-dim hover:text-ink">Reset link</button>
            </form>
          </div>
          <CopyField value={`${site}/report/${c.report_token}`} />
          <p className="mt-2 text-[11px] text-dim">Anyone with this link sees live views and approved clips. No login.</p>
        </Card>
        <Card className="flex min-w-0 flex-col justify-between gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">View sync</span>
            <span className="text-right text-[12px] text-dim">Runs every 6h</span>
          </div>
          <SyncButton campaignId={c.id} />
        </Card>
      </div>

      <div className="mt-8">
        <Tabs
          id="camp-admin"
          tabs={[
            { key: "clips", label: `Clips (${rows.length})`, content: clipsTab },
            { key: "edit", label: "Edit campaign", content: <CampaignForm c={c} clients={clients ?? []} /> },
            {
              key: "danger",
              label: "More",
              content: (
                <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div>
                    <div className="text-[14px] font-medium">Duplicate or delete</div>
                    <div className="text-[13px] text-mute">Campaigns with clips are archived as complete instead of deleted, so payout history stays intact.</div>
                  </div>
                  <div className="flex gap-2">
                    <form action={duplicateCampaign}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="h-9 rounded-full border border-line2 px-4 text-[12px] text-mute hover:text-ink">Duplicate</button>
                    </form>
                    <ConfirmButton action={deleteCampaign} id={c.id} label="Delete" confirmLabel="Click again to delete" />
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
