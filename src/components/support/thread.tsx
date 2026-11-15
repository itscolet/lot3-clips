"use client";
import { useActionState, useOptimistic, useState } from "react";
import { motion } from "motion/react";
import { replyTicket, type SupportState } from "@/lib/support-actions";
import { useLang, useT } from "@/lib/i18n/client";
import { timeAgoL } from "@/lib/i18n/dict";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { cn } from "@/lib/format";
import { AttachPicker, AutoTextarea, MessageText } from "./bits";

export type ThreadMessage = {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
  attachment_url?: string | null;
  pending?: boolean;
};

/** Clipper / visitor view of a conversation, with a reply box. */
export function SupportThread({
  ticketId,
  messages,
  token,
  canAttach,
  resolved,
}: {
  ticketId: string;
  messages: ThreadMessage[];
  token?: string;
  canAttach: boolean;
  resolved: boolean;
}) {
  const t = useT();
  const lang = useLang();
  const S = t.support;
  const [opt, addOpt] = useOptimistic(messages, (cur, m: ThreadMessage) => [...cur, m]);
  const [state, dispatch] = useActionState<SupportState, FormData>(async (prev, fd) => {
    const text = String(fd.get("body") ?? "").trim();
    if (text) addOpt({ id: `tmp-${Date.now()}`, author_role: "me", body: text, created_at: new Date().toISOString(), pending: true });
    return replyTicket(prev, fd);
  }, null);
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(0);
  const [lastBody, setLastBody] = useState("");
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.error) setBody(lastBody);
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-4">
        {opt.map((m, i) => {
          const mine = m.author_role !== "admin" && m.author_role !== "system";
          return (
            <motion.li
              key={m.id}
              initial={i >= messages.length ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex max-w-[88%] flex-col gap-1.5 sm:max-w-[75%]", mine ? "items-end self-end" : "items-start self-start")}
            >
              <div className="flex items-center gap-2 px-1 text-[11px] text-dim">
                {!mine && (
                  <span className="grid size-5 place-items-center rounded-full bg-ink text-[8px] font-bold tracking-tight text-black">L3</span>
                )}
                <span className={cn(!mine && "text-mute")}>{mine ? S.you : S.team}</span>
                <span>·</span>
                <span>{m.pending ? S.sending : timeAgoL(m.created_at, lang)}</span>
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-[14px] leading-[1.55]",
                  mine ? "rounded-br-md bg-ink text-black" : "rounded-bl-md border border-line2 bg-s2 text-ink",
                  m.pending && "opacity-60",
                )}
              >
                <MessageText text={m.body} />
              </div>
              {m.attachment_url && (
                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.attachment_url} alt="" className="max-h-64 w-auto object-contain" />
                </a>
              )}
            </motion.li>
          );
        })}
      </ol>

      {resolved && <p className="rounded-xl border border-dashed border-line2 px-4 py-3 text-center text-[12px] text-mute">{S.resolvedNote}</p>}

      <form
        action={dispatch}
        onSubmit={() => {
          setLastBody(body);
          setBody("");
          setSent((n) => n + 1);
        }}
        className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-gradient-to-t from-black via-black to-black/0 px-1 pb-2 pt-4 md:bottom-2">
        <input type="hidden" name="ticket_id" value={ticketId} />
        {token && <input type="hidden" name="token" value={token} />}
        <div className="rounded-2xl border border-line2 bg-s1 p-2 focus-within:border-[#555]">
          <AutoTextarea
            name="body"
            required
            maxLength={5000}
            minRows={2}
            maxRows={10}
            value={body}
            onValue={setBody}
            placeholder={S.replyPh}
            className="border-0 bg-transparent focus:bg-transparent"
          />
          <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5">
            {canAttach ? <AttachPicker key={sent} label={S.attach} removeLabel={S.remove} /> : <span />}
            <SubmitButton size="sm" pendingText={S.sending}>{S.reply}</SubmitButton>
          </div>
        </div>
        {state?.error && <FormNote state={{ error: S.err[state.error] ?? S.err.generic }} />}
      </form>
    </div>
  );
}
