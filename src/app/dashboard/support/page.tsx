import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { timeAgoL } from "@/lib/i18n/dict";
import { PageHead } from "@/components/site/shell";
import { Empty, LinkButton } from "@/components/ui/ui";
import { TicketStatusPill } from "@/components/support/status-pill";
import { AutoRefresh } from "@/components/support/bits";
import { cn } from "@/lib/format";
import type { SupportTicket } from "@/lib/types";

export default async function SupportListPage() {
  const [{ supabase, profile }, { lang, t }] = await Promise.all([requireUser(), getT()]);
  const S = t.support;
  const { data } = await supabase.from("support_tickets").select("*").eq("user_id", profile.id).order("last_message_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as SupportTicket[];

  return (
    <>
      <AutoRefresh every={30000} />
      <PageHead title={S.nav} sub={S.listSub} action={<LinkButton href="/dashboard/support/new">{S.newMsg}</LinkButton>} />
      {rows.length ? (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/support/${r.number}`}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border px-4 py-4 transition-colors duration-150 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
                  r.unread_user ? "border-[#4a4a4a] bg-s2 hover:bg-s3" : "border-line bg-s1 hover:bg-s2",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", r.unread_user ? "bg-ink" : "bg-transparent")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("truncate text-[14px]", r.unread_user ? "font-medium text-ink" : "text-ink")}>{r.subject}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-mute">
                      {r.last_message_from === "admin" ? `${S.team}: ` : ""}
                      {r.preview}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-5 sm:justify-end sm:pl-0">
                  <span className="num text-[11px] text-dim">{S.ticketNo(r.number)} · {timeAgoL(r.last_message_at, lang)}</span>
                  <TicketStatusPill status={r.status} label={S.status[r.status]} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title={S.emptyTitle} body={S.emptySub} action={<LinkButton href="/dashboard/support/new" variant="secondary">{S.newMsg}</LinkButton>} />
      )}
    </>
  );
}
