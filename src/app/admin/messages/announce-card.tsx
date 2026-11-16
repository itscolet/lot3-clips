"use client";
import { useActionState, useState } from "react";
import { announce, type MsgState } from "./actions";
import { Card } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { timeAgo } from "@/lib/format";

/** Campaign page: announce to opted-in clippers by email + SMS, or send yourself a test first. */
export function AnnounceCard({ id, live, announcedAt, emails, texts }: { id: string; live: boolean; announcedAt: string | null; emails: number; texts: number }) {
  const [state, action] = useActionState<MsgState, FormData>(announce, null);
  const [confirm, setConfirm] = useState(false);
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">Announce to clippers</span>
        <span className="text-right text-[12px] text-dim">{announcedAt ? `Sent ${timeAgo(announcedAt)}` : "Not sent yet"}</span>
      </div>
      <p className="text-[12px] text-mute">
        <span className="num text-ink">{emails}</span> opted in to email · <span className="num text-ink">{texts}</span> to texts. Each gets it in their language.
      </p>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <SubmitButton size="sm" variant="secondary" name="test" value="1" pendingText="Sending">Send test to me</SubmitButton>
        {confirm ? (
          <>
            <SubmitButton size="sm" pendingText="Sending">Confirm: send to {emails + texts}</SubmitButton>
            <button type="button" onClick={() => setConfirm(false)} className="h-8 px-2 text-[12px] text-dim hover:text-ink">Cancel</button>
          </>
        ) : (
          <button
            type="button"
            disabled={!live || emails + texts === 0}
            onClick={() => setConfirm(true)}
            title={!live ? "Set the campaign live first" : undefined}
            className="h-8 rounded-full bg-ink px-4 text-[12px] font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {announcedAt ? "Announce again" : "Announce"}
          </button>
        )}
      </form>
      {!live && <p className="text-[11px] text-dim">Set the campaign live to announce it. Tests work anytime.</p>}
      <FormNote state={state} />
    </Card>
  );
}
