import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { compact, timeAgo } from "@/lib/format";
import type { Platform } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { FilterTabs } from "@/components/admin/table";
import { Card, Empty, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { resolveFlag } from "../actions";
import { FLAG_RULES } from "@/lib/sync";

export const metadata = { title: "Fraud flags" };

const LABEL: Record<string, string> = {
  view_spike: "View spike",
  low_engagement: "Low engagement",
  missing: "Post missing",
  duplicate: "Duplicate",
  manual: "Manual flag",
};

type F = {
  id: string;
  type: string;
  detail: string | null;
  status: string;
  created_at: string;
  is_test: boolean;
  submissions: { id: string; url: string; platform: Platform; views: number; likes: number; status: string; campaigns: { id: string; title: string } | null } | null;
  profiles: { id: string; username: string; trust: string } | null;
};

export default async function FlagsPage({ searchParams }: PageProps<"/admin/flags">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("flags")
    .select(Q.flags)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  const flags = (data ?? []) as unknown as F[];
  const btn = "h-10 md:h-8 rounded-full px-3.5 text-[12px] font-medium transition-colors duration-150";

  return (
    <>
      <PageHead title="Fraud flags" sub="Raised automatically on every view sync. Decide, then they leave the queue." />
      <FilterTabs
        active={status}
        tabs={[
          { key: "open", label: "Open", href: "?status=open" },
          { key: "resolved", label: "Resolved", href: "?status=resolved" },
          { key: "dismissed", label: "Dismissed", href: "?status=dismissed" },
        ]}
      />
      {flags.length ? (
        <div className="flex flex-col gap-2">
          {flags.map((f) => (
            <Card key={f.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="w-32 shrink-0">
                <span className="block text-[13px] font-medium">{LABEL[f.type] ?? f.type}</span>
                <span className="text-[11px] text-dim">{timeAgo(f.created_at)}</span>
              </span>
              <div className="min-w-[220px] flex-1">
                <div className="flex items-center gap-2 text-[13px]">
                  {f.submissions && <PlatformIcon platform={f.submissions.platform} />}
                  <Link href={`/admin/clippers/${f.profiles?.id}`} className="font-medium hover:underline">{f.profiles?.username}</Link>
                  <span className="text-dim">·</span>
                  <Link href={`/admin/campaigns/${f.submissions?.campaigns?.id}`} className="text-mute hover:text-ink">{f.submissions?.campaigns?.title}</Link>
                  {f.is_test && <TestBadge />}
                </div>
                <div className="mt-0.5 text-[12px] text-mute">{f.detail}</div>
                {f.submissions && (
                  <a href={f.submissions.url} target="_blank" className="mt-0.5 block truncate text-[11px] text-dim hover:text-ink">
                    {f.submissions.url} · {compact(f.submissions.views)} views · {compact(f.submissions.likes)} likes
                  </a>
                )}
              </div>
              {f.submissions && <StatusBadge status={f.submissions.status} />}
              {f.status === "open" && (
                <form action={resolveFlag} className="flex gap-1.5">
                  <input type="hidden" name="id" value={f.id} />
                  <button name="op" value="reject" className={`${btn} bg-ink text-black hover:bg-white`}>Reject clip</button>
                  <button name="op" value="watch" className={`${btn} border border-line2 text-mute hover:text-ink`}>Watch clipper</button>
                  <button name="op" value="dismiss" className={`${btn} text-dim hover:text-ink`}>Dismiss</button>
                </form>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Empty title={status === "open" ? "No open flags" : "Nothing here"} />
      )}
      <Card className="mt-8 p-5 text-[12px] leading-relaxed text-mute">
        <div className="mb-2 text-[13px] font-medium text-ink">Current rules</div>
        View spike: +{FLAG_RULES.spikeMinDelta.toLocaleString()} views in one sync and more than {FLAG_RULES.spikeMultiplier}× the previous count (when it had at least {FLAG_RULES.spikeMinPrev.toLocaleString()}).
        <br />
        Low engagement: at least {FLAG_RULES.lowEngagementMinViews.toLocaleString()} views with a like rate under {(FLAG_RULES.lowEngagementRatio * 100).toFixed(1)}%.
        <br />
        Post missing: the tracker can&apos;t find a post that previously had views (deleted or set to private).
      </Card>
    </>
  );
}
