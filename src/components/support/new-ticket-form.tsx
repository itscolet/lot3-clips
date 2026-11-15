"use client";
import { useActionState, useState } from "react";
import { createTicket, type SupportState } from "@/lib/support-actions";
import { SUPPORT_CATEGORIES } from "@/lib/support";
import { useT } from "@/lib/i18n/client";
import { Field, Input, Select } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { cn } from "@/lib/format";
import { AttachPicker, AutoTextarea } from "./bits";

export function NewTicketForm({
  username,
  campaigns = [],
  compact = false,
  defaultCategory = "other",
}: {
  /** set when signed in */
  username?: string | null;
  campaigns?: { id: string; title: string }[];
  compact?: boolean;
  defaultCategory?: string;
}) {
  const t = useT();
  const S = t.support;
  const [state, action] = useActionState<SupportState, FormData>(createTicket, null);
  const [category, setCategory] = useState(defaultCategory);
  const [body, setBody] = useState("");
  const signedIn = !!username;
  const showCampaign = !compact && campaigns.length > 0 && (category === "campaign" || category === "payouts");

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {!signedIn && (
        <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
          <Field label={S.name}>
            <Input name="name" required maxLength={80} autoComplete="name" />
          </Field>
          <Field label={t.common.email} hint={compact ? undefined : S.emailHint}>
            <Input name="email" type="email" required maxLength={200} autoComplete="email" />
          </Field>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-mute">{S.topic}</span>
        <input type="hidden" name="category" value={category} />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={S.topic}>
          {SUPPORT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[12px] transition-colors duration-150 md:h-8",
                category === c ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:border-[#555] hover:text-ink",
              )}
            >
              {S.categories[c]}
            </button>
          ))}
        </div>
      </div>

      {showCampaign && (
        <Field label={S.campaign}>
          <Select name="campaign_id" defaultValue="">
            <option value="">{S.noCampaign}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={S.subject}>
        <Input name="subject" required minLength={3} maxLength={140} placeholder={S.subjectPh} />
      </Field>

      <Field label={S.message}>
        <AutoTextarea name="body" required maxLength={5000} minRows={compact ? 3 : 5} placeholder={S.messagePh} value={body} onValue={setBody} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {signedIn && <AttachPicker label={S.attach} removeLabel={S.remove} />}
          {signedIn && !compact && <span className="text-[12px] text-dim max-sm:hidden">{S.sendingAs(username!)}</span>}
        </div>
        <SubmitButton pendingText={S.sending} className={compact ? "w-full" : "max-sm:w-full"}>
          {S.send}
        </SubmitButton>
      </div>
      {state?.error && <FormNote state={{ error: S.err[state.error] ?? S.err.generic }} />}
    </form>
  );
}
