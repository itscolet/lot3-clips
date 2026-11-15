"use client";
import { useActionState, useState } from "react";
import { deleteReply, saveReply, type InboxState } from "../actions";
import { Field, Input } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { AutoTextarea } from "@/components/support/bits";
import { translateUrl } from "@/lib/support";
import { cn } from "@/lib/format";

type Reply = { id: string; title: string; body: string; body_es: string | null; sort: number };

export function ReplyEditor({ reply }: { reply?: Reply }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<InboxState, FormData>(saveReply, null);
  const [body, setBody] = useState(reply?.body ?? "");
  const [bodyEs, setBodyEs] = useState(reply?.body_es ?? "");
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok && !reply) {
      setBody("");
      setBodyEs("");
      setOpen(false);
    }
  }

  if (!open) {
    return reply ? (
      <button onClick={() => setOpen(true)} className="flex w-full items-start gap-4 rounded-2xl border border-line bg-s1 px-5 py-4 text-left transition-colors hover:bg-s2">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium">{reply.title}</div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-mute">{reply.body}</p>
        </div>
        <span className={cn("mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em]", reply.body_es ? "border-line2 text-mute" : "border-dashed border-line2 text-dim")}>
          {reply.body_es ? "EN + ES" : "EN only"}
        </span>
      </button>
    ) : (
      <button onClick={() => setOpen(true)} className="flex h-12 items-center justify-center rounded-2xl border border-dashed border-line2 text-[13px] text-mute transition-colors hover:border-[#555] hover:text-ink">
        + New saved reply
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-line2 bg-s1 p-5">
      <form action={action} className="flex flex-col gap-4">
        {reply && <input type="hidden" name="id" value={reply.id} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
          <Field label="Title (only admins see this)">
            <Input name="title" required maxLength={80} defaultValue={reply?.title} placeholder="e.g. Payout timing" />
          </Field>
          <Field label="Order">
            <Input name="sort" type="number" defaultValue={reply?.sort ?? 0} />
          </Field>
        </div>
        <Field label="English">
          <AutoTextarea name="body" required maxLength={5000} value={body} onValue={setBody} minRows={4} />
        </Field>
        <Field
          label="Spanish (sent to Spanish-speaking clippers)"
          hint={
            body.trim() ? (
              <a href={translateUrl(body, "es", "en")} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                Translate the English version ↗
              </a>
            ) : undefined
          }
        >
          <AutoTextarea name="body_es" maxLength={5000} value={bodyEs} onValue={setBodyEs} minRows={4} placeholder="Optional. Leave empty to always send English." />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SubmitButton size="sm" pendingText="Saving">{reply ? "Save" : "Add reply"}</SubmitButton>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-full px-3 text-[12px] text-mute hover:text-ink">Cancel</button>
          </div>
          {reply && (
            <SubmitButton size="sm" variant="ghost" formAction={deleteReply} pendingText="Deleting">Delete</SubmitButton>
          )}
        </div>
        <FormNote state={state} />
      </form>
    </div>
  );
}
