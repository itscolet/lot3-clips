import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Q } from "@/lib/queries";
import { PageHead } from "@/components/site/shell";
import { FilterTabs } from "@/components/admin/table";
import { LinkButton } from "@/components/ui/ui";
import { compact, money, timeAgo } from "@/lib/format";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, withAttachmentUrls } from "@/lib/support";
import { dict } from "@/lib/i18n/dict";
import { AutoRefresh } from "@/components/support/bits";
import { InboxList, type InboxRow } from "./inbox-list";
import { TicketPanel } from "./ticket-panel";
import type { SupportMessage, SupportTicket } from "@/lib/types";

export const metadata = { title: "Support" };

const VIEWS = ["open", "waiting", "mine", "unassigned", "resolved", "all"] as const;
type View = (typeof VIEWS)[number];
const CAT_LABEL = dict("en").support.categories;
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
type TicketRow = SupportTicket & { profiles: { id: string; username: string } | null; campaigns: { id: string; title: string; slug: string } | null };

export default async function SupportInboxPage({ searchParams }: PageProps<"/admin/support">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const view: View = (VIEWS as readonly string[]).includes(one("view")) ? (one("view") as View) : "open";
  const q = one("q");
  const cat = one("cat");
  const pri = one("pri");
  const tag = one("tag");
  const sort = one("sort") || (view === "open" || view === "unassigned" ? "oldest" : "newest");
  const selected = Number(one("t")) || null;

  const { supabase, profile } = await requireAdmin();

  // ---------- list ----------
  let list = supabase.from("support_tickets").select(Q.supportInbox).limit(150);
  if (view === "open") list = list.eq("status", "open");
  else if (view === "waiting") list = list.eq("status", "waiting");
  else if (view === "resolved") list = list.eq("status", "resolved");
  else if (view === "mine") list = list.eq("assigned_to", profile.id).neq("status", "resolved");
  else if (view === "unassigned") list = list.is("assigned_to", null).neq("status", "resolved");
  if (cat) list = list.eq("category", cat);
  if (pri) list = list.eq("priority", pri);
  if (tag) list = list.contains("tags", [tag]);
  if (q) {
    const safe = q.replace(/[%,()*]/g, " ").trim();
    const ors = [`subject.ilike.%${safe}%`, `preview.ilike.%${safe}%`, `guest_name.ilike.%${safe}%`, `guest_email.ilike.%${safe}%`];
    if (/^#?\d+$/.test(safe)) ors.push(`number.eq.${safe.replace("#", "")}`);
    const { data: users } = await supabase.from("profiles").select("id").ilike("username", `%${safe}%`).limit(50);
    if (users?.length) ors.push(`user_id.in.(${users.map((u) => u.id).join(",")})`);
    list = list.or(ors.join(","));
  }
  list = list.order("last_message_at", { ascending: sort === "oldest" });

  const since30 = daysAgo(30);
  const since7 = daysAgo(7);
  const head = () => supabase.from("support_tickets").select("id", { count: "exact", head: true });
  const [{ data: rows }, cOpen, cWaiting, cResolved, cMine, cUnassigned, cUnread, cResolved7, { data: recent }, { data: tagRows }, { data: admins }] = await Promise.all([
    list,
    head().eq("status", "open"),
    head().eq("status", "waiting"),
    head().eq("status", "resolved"),
    head().eq("assigned_to", profile.id).neq("status", "resolved"),
    head().is("assigned_to", null).neq("status", "resolved"),
    head().eq("unread_admin", true).neq("status", "resolved"),
    head().gte("resolved_at", since7),
    supabase.from("support_tickets").select("created_at,first_response_at").gte("created_at", since30).not("first_response_at", "is", null).limit(1000),
    supabase.from("support_tickets").select("tags").neq("status", "resolved").not("tags", "eq", "{}").limit(500),
    supabase.from("profiles").select("id,username").eq("role", "admin").order("username"),
  ]);
  const responses = (recent ?? []).map((r) => new Date(r.first_response_at!).getTime() - new Date(r.created_at).getTime()).sort((a, b) => a - b);
  const median = responses.length ? responses[Math.floor(responses.length / 2)] : null;
  const allTags = [...new Set((tagRows ?? []).flatMap((r) => r.tags as string[]))].sort();
  const adminName = new Map((admins ?? []).map((a) => [a.id, a.username]));

  // ---------- selected ticket ----------
  let ticket: TicketRow | null = null;
  let messages: SupportMessage[] = [];
  let context: React.ReactNode = null;
  let replies: { id: string; title: string; body: string; body_es: string | null }[] = [];
  if (selected) {
    const { data } = await supabase
      .from("support_tickets")
      .select("*, profiles!support_tickets_user_id_fkey(id,username), campaigns(id,title,slug)")
      .eq("number", selected)
      .maybeSingle();
    ticket = data as TicketRow | null;
    if (ticket) {
      const [{ data: msgs }, { data: saved }] = await Promise.all([
        supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at"),
        supabase.from("support_saved_replies").select("id,title,body,body_es").order("sort").order("title"),
        ticket.unread_admin ? supabase.from("support_tickets").update({ unread_admin: false }).eq("id", ticket.id) : Promise.resolve(null),
      ]);
      messages = await withAttachmentUrls(supabase, (msgs ?? []) as SupportMessage[]);
      replies = saved ?? [];
      context = await TicketContext({ ticket });
    }
  }

  const params = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string> = { view, q, cat, pri, tag, sort: one("sort"), t: selected ? String(selected) : "" };
    for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v) p.set(k, v);
    if (p.get("view") === "open") p.delete("view");
    const s = p.toString();
    return `/admin/support${s ? `?${s}` : ""}`;
  };

  // urgent and high float to the top; otherwise keep the chosen time order
  const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 2 };
  const items = ((rows ?? []) as unknown as InboxRow[]).map((r, i) => ({ r, i })).sort((a, b) => rank[a.r.priority] - rank[b.r.priority] || a.i - b.i).map((x) => x.r);
  const fmtDur = (ms: number) => (ms < 36e5 ? `${Math.max(1, Math.round(ms / 6e4))}m` : ms < 864e5 ? `${(ms / 36e5).toFixed(1)}h` : `${(ms / 864e5).toFixed(1)}d`);

  return (
    <>
      <AutoRefresh every={20000} />
      <div className={selected ? "max-lg:hidden" : ""}>
        <PageHead
          title="Support"
          sub={<><span className="max-md:hidden">J / K move · R reply · N note · E resolve · ⌘↵ send</span><span className="md:hidden">Messages from clippers and visitors.</span></>}
          action={<LinkButton href="/admin/support/replies" variant="secondary" size="sm">Saved replies</LinkButton>}
        />
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          <Kpi label="Needs reply" value={cOpen.count ?? 0} sub={`${cUnread.count ?? 0} unread`} href={params({ view: "open", t: null })} />
          <Kpi label="Waiting on clipper" value={cWaiting.count ?? 0} href={params({ view: "waiting", t: null })} />
          <Kpi label="Median first reply" value={median === null ? "—" : fmtDur(median)} sub="last 30 days" />
          <Kpi label="Resolved" value={cResolved7.count ?? 0} sub="last 7 days" href={params({ view: "resolved", t: null })} />
        </div>
        <FilterTabs
          active={view}
          tabs={[
            { key: "open", label: "Needs reply", count: cOpen.count ?? 0, href: params({ view: "open", t: null }) },
            { key: "waiting", label: "Waiting", count: cWaiting.count ?? 0, href: params({ view: "waiting", t: null }) },
            { key: "mine", label: "Mine", count: cMine.count ?? 0, href: params({ view: "mine", t: null }) },
            { key: "unassigned", label: "Unassigned", count: cUnassigned.count ?? 0, href: params({ view: "unassigned", t: null }) },
            { key: "resolved", label: "Resolved", count: cResolved.count ?? 0, href: params({ view: "resolved", t: null }) },
            { key: "all", label: "All", href: params({ view: "all", t: null }) },
          ]}
        />
        <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/support">
          {view !== "open" && <input type="hidden" name="view" value={view} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search subject, message, name, email, @user, #1001"
            className="h-10 min-w-0 flex-1 rounded-full border border-line2 bg-s1 px-4 text-[16px] outline-none placeholder:text-dim focus:border-[#555] md:h-9 md:text-[12px]"
          />
          <FilterSelect name="cat" value={cat} placeholder="All topics" options={SUPPORT_CATEGORIES.map((c) => [c, CAT_LABEL[c]])} />
          <FilterSelect name="pri" value={pri} placeholder="Any priority" options={SUPPORT_PRIORITIES.map((p) => [p, p[0].toUpperCase() + p.slice(1)])} />
          {allTags.length > 0 && <FilterSelect name="tag" value={tag} placeholder="Any tag" options={allTags.map((t) => [t, `#${t}`])} />}
          <FilterSelect name="sort" value={one("sort")} placeholder={sort === "oldest" ? "Oldest first" : "Newest first"} options={[["oldest", "Oldest first"], ["newest", "Newest first"]]} />
          <button className="h-10 shrink-0 rounded-full border border-line2 px-4 text-[12px] text-mute hover:text-ink md:h-9">Apply</button>
          {(q || cat || pri || tag || one("sort")) && (
            <Link href={params({ q: null, cat: null, pri: null, tag: null, sort: null, t: null })} className="px-2 text-[12px] text-dim hover:text-ink">Clear</Link>
          )}
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_280px]">
        <div className={selected ? "max-lg:hidden" : ""}>
          <InboxList
            items={items}
            selected={selected}
            hrefFor={Object.fromEntries(items.map((i) => [i.number, params({ t: String(i.number) })]))}
            emptyLabel={view === "open" ? "Inbox zero. Nobody's waiting on a reply." : "Nothing here."}
          />
        </div>

        {selected && ticket ? (
          <>
            <TicketPanel
              key={ticket.id}
              ticket={{
                id: ticket.id,
                number: ticket.number,
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                assigned_to: ticket.assigned_to,
                tags: ticket.tags,
                lang: ticket.lang,
                created_at: ticket.created_at,
                is_test: ticket.is_test,
                who: ticket.profiles?.username ? `@${ticket.profiles.username}` : ticket.guest_name ?? "Visitor",
                guest_email: ticket.user_id ? null : ticket.guest_email,
                guest_link: ticket.user_id ? null : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/support/t/${ticket.access_token}`,
                campaign: ticket.campaigns ? { id: ticket.campaigns.id, title: ticket.campaigns.title } : null,
                meta: (ticket.meta ?? {}) as Record<string, unknown>,
              }}
              messages={messages.map((m) => ({
                id: m.id,
                author_role: m.author_role,
                author: m.author_role === "admin" ? adminName.get(m.author_id ?? "") ?? "admin" : null,
                body: m.body,
                internal: m.internal,
                created_at: m.created_at,
                attachment_url: m.attachment_url ?? null,
              }))}
              admins={admins ?? []}
              replies={replies}
              backHref={params({ t: null })}
              context={context}
            />
            <aside className="hidden xl:sticky xl:top-8 xl:block xl:self-start">{context}</aside>
          </>
        ) : selected ? (
          <p className="py-20 text-center text-[13px] text-mute">Ticket #{selected} not found.</p>
        ) : (
          <div className="hidden min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-line2 text-[13px] text-dim lg:flex xl:col-span-2">
            Pick a conversation.
          </div>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, sub, href }: { label: string; value: React.ReactNode; sub?: string; href?: string }) {
  const inner = (
    <>
      <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{label}</div>
      <div className="num mt-2 text-[22px] leading-none md:text-[24px]">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-mute">{sub}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="block bg-s1 p-4 transition-colors hover:bg-s2">{inner}</Link>
  ) : (
    <div className="bg-s1 p-4">{inner}</div>
  );
}

function FilterSelect({ name, value, placeholder, options }: { name: string; value: string; placeholder: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={value} className="h-10 shrink-0 rounded-full border border-line2 bg-s1 px-3 text-[13px] text-mute outline-none md:h-9 md:text-[12px]">
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

/** Right-hand panel: who this is, their accounts, money and history. */
async function TicketContext({ ticket }: { ticket: SupportTicket }) {
  const { supabase } = await requireAdmin();
  if (!ticket.user_id) {
    const { data: others } = await supabase
      .from("support_tickets")
      .select("number,subject,status,created_at")
      .eq("guest_email", ticket.guest_email ?? "")
      .neq("id", ticket.id)
      .order("created_at", { ascending: false })
      .limit(5);
    return (
      <Panel>
        <Section title="Visitor">
          <Row k="Name" v={ticket.guest_name ?? "—"} />
          <Row k="Email" v={ticket.guest_email ? <a href={`mailto:${ticket.guest_email}`} className="hover:underline">{ticket.guest_email}</a> : "—"} />
          <Row k="Account" v="Not signed up" />
          <Row k="Language" v={ticket.lang === "es" ? "Spanish" : "English"} />
        </Section>
        <OtherTickets rows={others ?? []} />
      </Panel>
    );
  }
  const uid = ticket.user_id;
  const [{ data: p }, { data: accounts }, { data: subs }, { data: pays }, { data: email }, { data: others }] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,trust,status,country,created_at").eq("id", uid).maybeSingle(),
    supabase.from("social_accounts").select("platform,handle,followers,verified_at,audience_status").eq("user_id", uid),
    supabase.from("submissions").select("status,earnings").eq("user_id", uid),
    supabase.from("payouts").select("amount").eq("user_id", uid),
    supabase.rpc("admin_user_email", { p_user: uid }),
    supabase.from("support_tickets").select("number,subject,status,created_at").eq("user_id", uid).neq("id", ticket.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const count = (s: string) => (subs ?? []).filter((x) => x.status === s).length;
  const earned = (subs ?? []).filter((x) => x.status === "approved").reduce((a, x) => a + Number(x.earnings ?? 0), 0);
  const paid = (pays ?? []).reduce((a, x) => a + Number(x.amount ?? 0), 0);
  return (
    <Panel>
      <Section title="Clipper">
        <Row k="User" v={<Link href={`/admin/clippers/${uid}`} className="hover:underline">@{p?.username ?? "—"}</Link>} />
        {email && <Row k="Email" v={<a href={`mailto:${email}`} className="block max-w-[150px] truncate hover:underline">{String(email)}</a>} />}
        <Row k="Joined" v={p ? timeAgo(p.created_at) : "—"} />
        <Row k="Trust" v={p?.trust ?? "—"} />
        {p?.status === "banned" && <Row k="Status" v="Banned" />}
        <Row k="Language" v={ticket.lang === "es" ? "Spanish" : "English"} />
      </Section>
      <Section title="Accounts">
        {(accounts ?? []).length ? (
          (accounts ?? []).map((a) => (
            <Row
              key={`${a.platform}-${a.handle}`}
              k={`@${a.handle}`}
              v={<span className="text-mute">{a.platform}{a.followers ? ` · ${compact(a.followers)}` : ""} · {a.verified_at ? "verified" : "unverified"}</span>}
            />
          ))
        ) : (
          <p className="py-2 text-[12px] text-dim">No accounts connected.</p>
        )}
      </Section>
      <Section title="Clips & money">
        <Row k="Clips" v={`${count("approved")} approved · ${count("pending")} pending · ${count("rejected")} rejected`} />
        <Row k="Earned" v={money(earned)} />
        <Row k="Paid out" v={money(paid)} />
        <Row k="Owed" v={money(Math.max(0, earned - paid))} />
      </Section>
      <OtherTickets rows={others ?? []} />
    </Panel>
  );
}

function OtherTickets({ rows }: { rows: { number: number; subject: string; status: string; created_at: string }[] }) {
  if (!rows.length) return null;
  return (
    <Section title="Other conversations">
      {rows.map((r) => (
        <Link key={r.number} href={`/admin/support?view=all&t=${r.number}`} className="flex items-center justify-between gap-3 py-2 text-[12px] hover:text-ink">
          <span className="min-w-0 truncate text-mute">#{r.number} {r.subject}</span>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-dim">{r.status}</span>
        </Link>
      ))}
    </Section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5 rounded-2xl border border-line bg-s1 p-5">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[0.1em] text-dim">{title}</div>
      <div className="flex flex-col divide-y divide-line">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
      <span className="shrink-0 text-mute">{k}</span>
      <span className="min-w-0 text-right">{v}</span>
    </div>
  );
}
