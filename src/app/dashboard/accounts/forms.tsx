"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { claimAccount, removeAccount, uploadAudience, type ActionState, type ClaimState } from "../actions";
import { PlatformIcon } from "@/components/ui/icons";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { Badge, Card, Input } from "@/components/ui/ui";
import { FormNote } from "@/components/ui/form-note";
import { compact, PLATFORM_LABEL, cn } from "@/lib/format";
import type { Platform, SocialAccount } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

const CLAIMABLE: Platform[] = ["tiktok", "instagram", "youtube"];

export function ConnectForm() {
  const [state, action] = useActionState<ClaimState, FormData>(claimAccount, null);
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const t = useT();
  const A = t.accounts;
  return (
    <ActionForm action={action} className="flex flex-col gap-3">
      <input type="hidden" name="platform" value={platform} />
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={A.platform}>
        {CLAIMABLE.map((p) => (
          <button
            type="button"
            key={p}
            role="radio"
            aria-checked={platform === p}
            onClick={() => setPlatform(p)}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-[12px] transition-colors duration-150 sm:text-[13px]",
              platform === p ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:text-ink",
            )}
          >
            <PlatformIcon platform={p} /> {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>
      <Input name="handle" placeholder={A.handlePh} required autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <p className="-mt-1 text-[11px] text-dim">{A.handleHint}</p>
      <SubmitButton pendingText={A.adding}>{A.addBtn}</SubmitButton>
      {state?.error ? (
        <div className="rounded-xl border border-line2 bg-s2 px-4 py-3 text-[13px] leading-relaxed">
          <p className="text-ink">{state.error}</p>
          {state.ticket && (
            <Link href={`/dashboard/support/${state.ticket}`} className="mt-2 inline-block text-[12px] text-mute underline underline-offset-4 hover:text-ink">
              {A.openTicket(state.ticket)}
            </Link>
          )}
        </div>
      ) : (
        <FormNote state={state} />
      )}
    </ActionForm>
  );
}

export function AccountCard({ a }: { a: SocialAccount }) {
  const [uState, uAction] = useActionState<ActionState, FormData>(uploadAudience, null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const t = useT();
  const A = t.accounts;
  const active = !!a.verified_at;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line2 bg-s2">
          <PlatformIcon platform={a.platform} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium">@{a.handle}</div>
          <div className="text-[12px] text-dim">
            {PLATFORM_LABEL[a.platform]}
            {a.followers ? A.followers(compact(a.followers)) : ""}
          </div>
        </div>
        {active ? <Badge tone="solid">{A.verified}</Badge> : <Badge tone="outline">{A.unverified}</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-[13px]">
          <span className="text-mute">{A.usAudience}</span>
          {a.audience_status === "approved" && <span>{A.approved}{a.us_audience_pct ? A.usPct(a.us_audience_pct) : ""}</span>}
          {a.audience_status === "pending" && <span>{A.inReview}</span>}
          {a.audience_status === "rejected" && <span>{A.rejected}</span>}
          {a.audience_status === "none" && <span className="text-dim">{A.notSubmitted}</span>}
        </div>
        {a.audience_status !== "approved" && (
          <ActionForm action={uAction} className="flex w-full items-center gap-2 sm:w-auto">
            <input type="hidden" name="id" value={a.id} />
            <Input type="file" name="file" accept="image/*" className="h-10 min-w-0 flex-1 py-1.5 text-[12px] sm:w-56 sm:flex-none file:mr-3 file:rounded-full file:border-0 file:bg-s3 file:px-3 file:py-1 file:text-[12px] file:text-ink" />
            <SubmitButton size="sm" variant="secondary" pendingText={A.uploading}>{A.upload}</SubmitButton>
          </ActionForm>
        )}
      </div>
      <p className="mt-2 text-[11px] text-dim">{A.usHint}</p>
      {uState && <div className="mt-3"><FormNote state={uState} /></div>}

      <div className="mt-3 flex items-center gap-3">
        {confirmRemove ? (
          <ActionForm action={removeAccount} className="flex items-center gap-3">
            <input type="hidden" name="id" value={a.id} />
            <span className="text-[12px] text-mute">{A.removeConfirm}</span>
            <button className="text-[12px] font-medium text-ink underline underline-offset-4">{A.remove}</button>
            <button type="button" onClick={() => setConfirmRemove(false)} className="text-[12px] text-dim hover:text-ink">{A.cancel}</button>
          </ActionForm>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className="text-[12px] text-dim hover:text-ink">{A.remove}</button>
        )}
      </div>
    </Card>
  );
}
