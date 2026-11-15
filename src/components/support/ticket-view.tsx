import Link from "next/link";
import { resolveTicket } from "@/lib/support-actions";
import { dict, shortDateL, type Lang } from "@/lib/i18n/dict";
import { SubmitButton } from "@/components/ui/motion";
import { TicketStatusPill } from "./status-pill";
import { SupportThread, type ThreadMessage } from "./thread";
import { AutoRefresh, CopyButton } from "./bits";

/** Shared clipper / visitor conversation page body. */
export function TicketView({
  lang,
  ticket,
  messages,
  token,
  canAttach,
  backHref,
  justCreated,
  shareUrl,
}: {
  lang: Lang;
  ticket: { id: string; number: number; subject: string; category: string; status: string; created_at: string };
  messages: ThreadMessage[];
  token?: string;
  canAttach: boolean;
  backHref?: string;
  justCreated?: boolean;
  /** visitors only: their private link */
  shareUrl?: string;
}) {
  const S = dict(lang).support;
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <AutoRefresh />
      {backHref && (
        <Link href={backHref} className="text-[12px] text-mute hover:text-ink">
          {S.back}
        </Link>
      )}

      {justCreated && (
        <div className="mt-5 rounded-2xl border border-ink/30 bg-ink/[0.06] p-4 sm:p-5">
          <div className="text-[14px] font-medium">✓ {S.sentTitle}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-mute">{S.sentBody}</p>
        </div>
      )}

      {shareUrl && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line2 bg-s1 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">{S.saveTitle}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-mute">{S.saveBody}</p>
            <p className="num mt-2 truncate text-[11px] text-dim">{shareUrl}</p>
          </div>
          <CopyButton text={shareUrl} label={S.copyLink} done={S.copied} />
        </div>
      )}

      <header className="mt-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-dim">
            <span className="num">{S.ticketNo(ticket.number)}</span>
            <span>·</span>
            <span>{S.categories[ticket.category] ?? ticket.category}</span>
            <span>·</span>
            <span>{shortDateL(ticket.created_at, lang)}</span>
          </div>
          <h1 className="mt-2 text-[24px] font-medium leading-tight tracking-[-0.03em] sm:text-[28px]">{ticket.subject}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TicketStatusPill status={ticket.status} label={S.status[ticket.status] ?? ticket.status} />
          {ticket.status !== "resolved" && (
            <form action={resolveTicket}>
              <input type="hidden" name="ticket_id" value={ticket.id} />
              {token && <input type="hidden" name="token" value={token} />}
              <SubmitButton size="sm" variant="ghost">{S.resolve}</SubmitButton>
            </form>
          )}
        </div>
      </header>

      <div className="mt-6">
        <SupportThread ticketId={ticket.id} messages={messages} token={token} canAttach={canAttach} resolved={ticket.status === "resolved"} />
      </div>
    </div>
  );
}
