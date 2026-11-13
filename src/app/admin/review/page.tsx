import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { PageHead } from "@/components/site/shell";
import { FilterTabs } from "@/components/admin/table";
import { Empty, LinkButton } from "@/components/ui/ui";
import { ReviewQueue, type QueueItem } from "./queue";

export const metadata = { title: "Review queue" };

export default async function ReviewPage({ searchParams }: PageProps<"/admin/review">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "pending";
  const campaign = typeof sp.campaign === "string" ? sp.campaign : "";
  const { supabase } = await requireAdmin();
  let q = supabase
    .from("submissions")
    .select(Q.reviewQueue)
    .order("created_at", { ascending: status === "pending" })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  if (campaign) q = q.eq("campaign_id", campaign);
  const [{ data }, { data: camps }, counts] = await Promise.all([
    q,
    supabase.from("campaigns").select("id,title").in("status", ["live", "paused"]).order("title"),
    Promise.all(
      ["pending", "approved", "rejected"].map((s) => {
        let cq = supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", s);
        if (campaign) cq = cq.eq("campaign_id", campaign);
        return cq;
      }),
    ),
  ]);
  const items = (data ?? []) as unknown as QueueItem[];
  const base = campaign ? `?campaign=${campaign}&` : "?";

  // prior history per clipper for context
  const userIds = [...new Set(items.map((i) => i.profiles?.id).filter(Boolean))] as string[];
  const history: Record<string, { approved: number; rejected: number }> = {};
  if (userIds.length) {
    const { data: h } = await supabase.from("submissions").select("user_id,status").in("user_id", userIds).in("status", ["approved", "rejected"]);
    for (const r of h ?? []) {
      history[r.user_id] ??= { approved: 0, rejected: 0 };
      history[r.user_id][r.status as "approved" | "rejected"]++;
    }
  }

  return (
    <>
      <PageHead
        title="Review queue"
        sub="J / K to move · A approve · R reject · O open clip"
        action={
          <form className="flex items-center gap-2">
            <input type="hidden" name="status" value={status} />
            <select name="campaign" defaultValue={campaign} className="h-9 rounded-full border border-line2 bg-s1 px-3 text-[12px] text-mute outline-none">
              <option value="">All campaigns</option>
              {(camps ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button className="h-9 rounded-full border border-line2 px-4 text-[12px] text-mute hover:text-ink">Filter</button>
          </form>
        }
      />
      <FilterTabs
        active={status}
        tabs={[
          { key: "pending", label: "Pending", count: counts[0].count ?? 0, href: `${base}status=pending` },
          { key: "approved", label: "Approved", count: counts[1].count ?? 0, href: `${base}status=approved` },
          { key: "rejected", label: "Rejected", count: counts[2].count ?? 0, href: `${base}status=rejected` },
          { key: "all", label: "All", href: `${base}status=all` },
        ]}
      />
      {items.length ? (
        <ReviewQueue items={items} history={history} />
      ) : (
        <Empty title={status === "pending" ? "Inbox zero" : "Nothing here"} body={status === "pending" ? "No clips waiting for review." : undefined} action={<LinkButton href="/admin" variant="secondary">Back to overview</LinkButton>} />
      )}
    </>
  );
}
