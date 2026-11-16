"use client";
import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { saveNotifications, type ActionState } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ui/motion";
import { Field, Input } from "@/components/ui/ui";
import { FormNote } from "@/components/ui/form-note";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/format";

export function NotificationsForm({ emailOptIn, smsOptIn, phone }: { emailOptIn: boolean; smsOptIn: boolean; phone: string | null }) {
  const t = useT();
  const S = t.settings;
  const [state, action] = useActionState<ActionState, FormData>(saveNotifications, null);
  const [email, setEmail] = useState(emailOptIn);
  const [sms, setSms] = useState(smsOptIn);
  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <Toggle name="email_opt_in" on={email} onChange={setEmail} title={S.emailCampaigns} sub={S.emailCampaignsSub} />
      <Toggle name="sms_opt_in" on={sms} onChange={setSms} title={S.sms} sub={S.smsSub} />
      <AnimatePresence initial={false}>
        {sms && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="flex flex-col gap-2">
              <Field label={t.signup.phone} hint={t.signup.phoneHint}>
                <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={phone ?? ""} placeholder={t.signup.phonePh} required />
              </Field>
              <p className="text-[11px] leading-relaxed text-dim">{t.signup.smsConsent}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!sms && phone && <input type="hidden" name="phone" value={phone} />}
      <p className="text-[12px] text-dim">{S.emailAlways}</p>
      <div className="flex items-center gap-3">
        <SubmitButton pendingText={t.common.saving}>{t.common.save}</SubmitButton>
        <FormNote state={state} />
      </div>
    </ActionForm>
  );
}

function Toggle({ name, on, onChange, title, sub }: { name: string; on: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-[14px]">{title}</span>
        <span className="block text-[12px] text-mute">{sub}</span>
      </span>
      <input type="checkbox" name={name} value="1" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 peer-focus-visible:ring-1 peer-focus-visible:ring-[#888]", on ? "border-ink bg-ink" : "border-line2 bg-s2")}>
        <motion.span className={cn("absolute top-0.5 size-[18px] rounded-full", on ? "bg-black" : "bg-mute")} animate={{ left: on ? 22 : 2 }} transition={{ type: "spring", stiffness: 600, damping: 36 }} />
      </span>
    </label>
  );
}
