"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { adminReply, setTags, updateTicket, type InboxState } from "./actions";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, translateUrl } from "@/lib/support";
import { dict } from "@/lib/i18n/dict";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { TestBadge } from "@/components/ui/ui";
import { AutoTextarea, MessageText } from "@/components/support/bits";
import { cn, timeAgo } from "@/lib/format";
import { ClaimCard } from "./claim-card";

type Ticket = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  tags: string[];
  lang: string;
  created_at: string;
  is_test: boolean;
  who: string;
  guest_email: string | null;
  guest_link: string | null;
  campaign: { id: string; title: string } | null;
  meta: Record<string, unknown>;
};
type Msg = { id: string; author_role: string; author: string | null; body: string; internal: boolean; created_at: string; attachment_url: string | null };
type Reply = { id: string; title: string; body: string; body_es: string | null };

const CAT = dict("en").support.categories;
const STATUSES: [string, string][] = [["open", "Needs reply"], ["waiting", "Waiting"], ["resolved", "Resolved"]];

export function TicketPanel({
  ticket,
  messages,
  admins,
  replies,
  backHref,
  context,
}: {
  ticket: Ticket;
  messages: Msg[];
  admins: { id: string; username: string }[];
  replies: Reply[];
  backHref: string;
  context: React.ReactNode;
}) {
  const [, start] = useTransition();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [category, setCategory] = useState(ticket.category);
  const [assignee, setAssignee] = useState(ticket.assigned_to ?? "");
  const [tags, setTagList] = useState(ticket.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [body, setBody] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [replyFilter, setReplyFilter] = useState("");
  const [sentToGuest, setSentToGuest] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // keep local controls in sync when the server sends fresher data
  const [seen, setSeen] = useState(ticket);
  if (seen !== ticket) {
    setSeen(ticket);
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setCategory(ticket.category);
    setAssignee(ticket.assigned_to ?? "");
    setTagList(ticket.tags);
  }

  const [state, dispatch] = useActionState<InboxState, FormData>(adminReply, null);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok) {
      setBody("");
      if (mode === "reply" && ticket.guest_email) setSentToGuest(true);
    }
  }

  const save = (field: string, value: string) =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", ticket.id);
      fd.set("field", field);
      fd.set("value", value);
      await updateTicket(fd);
    });
  const saveTags = (next: string[]) => {
    setTagList(next);
    start(async () => {
      const fd = new FormData();
      fd.set("id", ticket.id);
      next.forEach((t) => fd.append("tag", t));
      await setTags(fd);
    });
  };

  // keyboard: R reply, N note, E resolve
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "n") {
        e.preventDefault();
        setMode(e.key === "r" ? "reply" : "note");
        boxRef.current?.focus();
      } else if (e.key === "e") {
        e.preventDefault();
        setStatus("resolved");
        save("status", "resolved");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const insert = (text: string) => {
    setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n${text}` : text));
    setShowReplies(false);
    setMode("reply");
    requestAnimationFrame(() => boxRef.current?.focus());
  };

  const es = ticket.lang === "es";
  const mailto = ticket.guest_email
    ? `mailto:${ticket.guest_email}?subject=${encodeURIComponent(`Re: ${ticket.subject} (#${ticket.number})`)}&body=${encodeURIComponent(
        es
          ? `Hola,\n\nRespondimos a tu mensaje. Puedes verlo aquí:\n${ticket.guest_link}\n\n— LOT3 Clips`
          : `Hi,\n\nWe replied to your message. You can see it here:\n${ticket.guest_link}\n\n— LOT3 Clips`,
      )}`
    : null;
  const filtered = replies.filter((r) => !replyFilter || `${r.title} ${r.body}`.toLowerCase().includes(replyFilter.toLowerCase()));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link href={backHref} scroll={false} className="text-[12px] text-mute hover:text-ink lg:hidden">
        ← Inbox
      </Link>

      {/* header */}
      <div className="rounded-2xl border border-line bg-s1 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-dim">
          <span className="num">#{ticket.number}</span>
          <span>·</span>
          <span>{ticket.who}</span>
          {!ticket.guest_email ? null : <span className="rounded border border-line2 px-1.5 py-0.5 text-[10px]">Visitor</span>}
          {es && <span className="rounded border border-line2 px-1.5 py-0.5 text-[10px]">Spanish</span>}
          {ticket.is_test && <TestBadge />}
          <span>·</span>
          <span className="normal-case tracking-normal">opened {timeAgo(ticket.created_at)}</span>
        </div>
        <h2 className="mt-2 text-[20px] font-medium leading-tight tracking-[-0.025em] sm:text-[22px]">{ticket.subject}</h2>
        {ticket.campaign && (
          <Link href={`/admin/campaigns/${ticket.campaign.id}`} className="mt-1 inline-block text-[12px] text-mute hover:text-ink">
            Campaign: {ticket.campaign.title} →
          </Link>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line2 p-0.5" role="group" aria-label="Status">
            {STATUSES.map(([k, l]) => (
              <button
                key={k}
                onClick={() => {
                  setStatus(k);
                  save("status", k);
                }}
                aria-pressed={status === k}
                className="relative h-8 rounded-full px-3 text-[12px] md:h-7"
              >
                {status === k && <motion.span layoutId={`status-${ticket.id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className={cn("relative", status === k ? "text-black" : "text-mute hover:text-ink")}>{l}</span>
              </button>
            ))}
          </div>
          <Ctl
            label="Priority"
            value={priority}
            onChange={(v) => {
              setPriority(v);
              save("priority", v);
            }}
            options={SUPPORT_PRIORITIES.map((p) => [p, p[0].toUpperCase() + p.slice(1)])}
          />
          <Ctl
            label="Topic"
            value={category}
            onChange={(v) => {
              setCategory(v);
              save("category", v);
            }}
            options={SUPPORT_CATEGORIES.map((c) => [c, CAT[c]])}
          />
          <Ctl
            label="Assignee"
            value={assignee}
            onChange={(v) => {
              setAssignee(v);
              save("assigned_to", v);
            }}
            options={[["", "Unassigned"], ...admins.map((a) => [a.id, `@${a.username}`] as [string, string])]}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="flex h-7 items-center gap-1 rounded-full border border-line2 pl-2.5 pr-1 text-[11px] text-mute">
              #{t}
              <button onClick={() => saveTags(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="grid size-5 place-items-center rounded-full hover:bg-s3 hover:text-ink">
                ×
              </button>
            </span>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = tagDraft.trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "").slice(0, 24);
              if (v && !tags.includes(v) && tags.length < 8) saveTags([...tags, v]);
              setTagDraft("");
            }}
          >
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="+ tag"
              aria-label="Add tag"
              className="h-7 w-24 rounded-full border border-dashed border-line2 bg-transparent px-2.5 text-[16px] text-ink outline-none placeholder:text-dim focus:w-36 focus:border-[#555] md:text-[11px]"
            />
          </form>
          {mailto && (
            <a href={mailto} className="ml-auto flex h-7 items-center rounded-full border border-line2 px-3 text-[11px] text-mute hover:text-ink">
              Email visitor their link ↗
            </a>
          )}
        </div>
      </div>

      {ticket.meta?.type === "claim_conflict" && (
        <ClaimCard ticketId={ticket.id} meta={ticket.meta as unknown as Parameters<typeof ClaimCard>[0]["meta"]} lang={ticket.lang} />
      )}

      {context && (
        <details className="group rounded-2xl border border-line bg-s1 xl:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] text-mute">
            {ticket.guest_email ? "Visitor details" : "Clipper details"}
            <span className="transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="px-2 pb-2 [&>div]:border-0 [&>div]:bg-transparent">{context}</div>
        </details>
      )}

      {/* thread */}
      <ol className="flex flex-col gap-4 py-2">
        {messages.map((m) => {
          if (m.internal) {
            return (
              <li key={m.id} className="rounded-xl border border-dashed border-line2 px-4 py-3">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-dim">
                  <span className="font-medium uppercase tracking-[0.1em] text-mute">Internal note</span>
                  <span>·</span>
                  <span>{m.author ? `@${m.author}` : "auto"}</span>
                  <span>·</span>
                  <span>{timeAgo(m.created_at)}</span>
                </div>
                <MessageText text={m.body} className="text-[13px] leading-[1.55] text-mute" />
              </li>
            );
          }
          const team = m.author_role === "admin" || m.author_role === "system";
          return (
            <li key={m.id} className={cn("flex max-w-[88%] flex-col gap-1.5 sm:max-w-[78%]", team ? "items-end self-end" : "items-start self-start")}>
              <div className="flex items-center gap-2 px-1 text-[11px] text-dim">
                <span className={team ? "" : "text-mute"}>{team ? (m.author ? `@${m.author}` : "Auto message") : ticket.who}</span>
                <span>·</span>
                <span>{timeAgo(m.created_at)}</span>
                {!team && (
                  <a href={translateUrl(m.body, "en")} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                    Translate ↗
                  </a>
                )}
              </div>
              <div className={cn("rounded-2xl px-4 py-3 text-[14px] leading-[1.55]", team ? "rounded-br-md bg-ink text-black" : "rounded-bl-md border border-line2 bg-s2 text-ink")}>
                <MessageText text={m.body} />
              </div>
              {m.attachment_url && (
                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.attachment_url} alt="Attachment" className="max-h-72 w-auto object-contain" />
                </a>
              )}
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      {sentToGuest && mailto && (
        <div className="flex flex-col gap-2 rounded-xl border border-line2 bg-s1 px-4 py-3 text-[12px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>Visitors aren&apos;t notified automatically. Send them their private link so they see your reply.</span>
          <a href={mailto} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-center text-[11px] font-medium text-black">Email link ↗</a>
        </div>
      )}

      {/* composer */}
      <form action={dispatch} className="sticky bottom-0 z-10 -mx-1 bg-gradient-to-t from-black via-black to-black/0 px-1 pb-3 pt-4">
        <input type="hidden" name="ticket_id" value={ticket.id} />
        <input type="hidden" name="internal" value={mode === "note" ? "1" : "0"} />
        <div className={cn("relative rounded-2xl border bg-s1 p-2 transition-colors", mode === "note" ? "border-dashed border-[#555]" : "border-line2 focus-within:border-[#555]")}>
          <div className="flex items-center gap-1 px-1 pb-1.5">
            {(["reply", "note"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={cn("h-7 rounded-full px-3 text-[12px] transition-colors", mode === k ? "bg-s3 text-ink" : "text-dim hover:text-ink")}
              >
                {k === "reply" ? "Reply" : "Internal note"}
              </button>
            ))}
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowReplies((s) => !s)}
                aria-expanded={showReplies}
                className="flex h-7 items-center gap-1 rounded-full border border-line2 px-3 text-[12px] text-mute hover:text-ink"
              >
                Saved replies <span className="text-dim">▾</span>
              </button>
              <AnimatePresence>
                {showReplies && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute bottom-9 right-0 z-20 w-[min(360px,85vw)] overflow-hidden rounded-2xl border border-line2 bg-[#0c0c0c] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
                  >
                    <div className="border-b border-line p-2">
                      <input
                        autoFocus
                        value={replyFilter}
                        onChange={(e) => setReplyFilter(e.target.value)}
                        placeholder="Filter saved replies"
                        className="h-9 w-full rounded-lg bg-s2 px-3 text-[16px] outline-none placeholder:text-dim md:text-[12px]"
                      />
                    </div>
                    <ul className="max-h-72 overflow-y-auto p-1">
                      {filtered.map((r) => (
                        <li key={r.id} className="flex items-start gap-2 rounded-lg px-2.5 py-2 hover:bg-s2">
                          <button type="button" onClick={() => insert(es && r.body_es ? r.body_es : r.body)} className="min-w-0 flex-1 text-left">
                            <div className="truncate text-[12px] font-medium text-ink">{r.title}</div>
                            <div className="truncate text-[11px] text-dim">{es && r.body_es ? r.body_es : r.body}</div>
                          </button>
                          <div className="flex shrink-0 gap-1 pt-0.5">
                            <button type="button" onClick={() => insert(r.body)} className="rounded border border-line2 px-1.5 text-[10px] text-mute hover:text-ink">EN</button>
                            {r.body_es && <button type="button" onClick={() => insert(r.body_es!)} className="rounded border border-line2 px-1.5 text-[10px] text-mute hover:text-ink">ES</button>}
                          </div>
                        </li>
                      ))}
                      {!filtered.length && <li className="px-3 py-4 text-center text-[12px] text-dim">No saved replies match.</li>}
                    </ul>
                    <Link href="/admin/support/replies" className="block border-t border-line px-4 py-2.5 text-[12px] text-mute hover:text-ink">Manage saved replies →</Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <AutoTextarea
            ref={boxRef}
            name="body"
            value={body}
            onValue={setBody}
            minRows={3}
            maxRows={14}
            maxLength={5000}
            placeholder={mode === "note" ? "Only admins see notes. Use @ for context, links for evidence…" : es ? `Reply to ${ticket.who} (they use Spanish)…` : `Reply to ${ticket.who}…`}
            className="border-0 bg-transparent focus:bg-transparent"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pb-0.5">
            <span className="text-[11px] text-dim">
              {mode === "reply" && es && body.trim() ? (
                <a href={translateUrl(body, "es", "en")} target="_blank" rel="noopener noreferrer" className="text-mute underline underline-offset-2 hover:text-ink">
                  Translate draft to Spanish ↗
                </a>
              ) : (
                <span className="max-md:hidden">⌘↵ to send</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {mode === "reply" ? (
                <>
                  <SubmitButton size="sm" variant="secondary" name="resolve" value="1" pendingText="Sending">Send &amp; resolve</SubmitButton>
                  <SubmitButton size="sm" pendingText="Sending">Send</SubmitButton>
                </>
              ) : (
                <SubmitButton size="sm" pendingText="Saving">Add note</SubmitButton>
              )}
            </div>
          </div>
        </div>
        {state?.error && <div className="mt-2"><FormNote state={state} /></div>}
      </form>
    </div>
  );
}

function Ctl({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex h-8 items-center gap-1.5 rounded-full border border-line2 pl-3 pr-1 text-[12px] md:h-7">
      <span className="text-dim">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-full max-w-[140px] bg-transparent pr-1 text-ink outline-none">
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-black">{l}</option>
        ))}
      </select>
    </label>
  );
}
