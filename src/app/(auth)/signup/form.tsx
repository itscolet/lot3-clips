"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signUp, type AuthState } from "../actions";
import { Field, Input } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { TermsBody } from "@/components/site/terms-body";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/format";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  const t = useT();
  const S = t.signup;
  const boxRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [read, setRead] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [emailOpt, setEmailOpt] = useState(true);
  const [smsOpt, setSmsOpt] = useState(false);

  const onScroll = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max <= 0 ? 1 : el.scrollTop / max;
    setProgress(p);
    if (p > 0.97) setRead(true);
  }, []);
  useEffect(() => {
    onScroll();
  }, [onScroll]);

  const scrollDown = () => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-medium tracking-[-0.035em]">{S.title}</h1>
        <p className="mt-1.5 text-[14px] text-mute">{S.sub}</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <Field label={t.common.username} hint={S.usernameHint}>
        <Input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_.]+" autoComplete="username" />
      </Field>
      <Field label={t.common.email}><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label={t.common.password} hint={S.passwordHint}>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>

      {/* terms: scroll to the end to unlock accept */}
      <div className="overflow-hidden rounded-2xl border border-line2 bg-s1">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="text-[12px] font-medium">{S.termsTitle}</span>
          <span className={cn("text-[11px] transition-colors", read ? "text-ink" : "text-dim")}>{read ? S.readDone : S.termsRead}</span>
        </div>
        <div className="h-[2px] bg-line">
          <motion.div className="h-full bg-ink" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ duration: 0.12, ease: "linear" }} />
        </div>
        <div className="relative">
          <div
            ref={boxRef}
            onScroll={onScroll}
            tabIndex={0}
            aria-label={S.termsTitle}
            className="h-[240px] overflow-y-auto overscroll-contain px-4 py-4 outline-none [scrollbar-width:thin] focus-visible:ring-1 focus-visible:ring-[#555]"
          >
            <p className="mb-4 text-[12px] leading-relaxed text-mute">{t.terms.intro}</p>
            <TermsBody T={t.terms} compact />
            <p className="mt-5 text-[11px] text-dim">{t.terms.updated}</p>
          </div>
          <AnimatePresence>
            {!read && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-s1 via-s1/90 to-transparent pb-3"
              >
                <button
                  type="button"
                  onClick={scrollDown}
                  className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12px] font-medium text-black shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.97]"
                >
                  {S.scrollBtn}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className={cn("flex items-start gap-2.5 text-[13px] transition-opacity", read ? "text-ink" : "cursor-not-allowed text-dim")}>
          <input
            type="checkbox"
            name="agree"
            value="1"
            disabled={!read}
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-white"
          />
          <span>{read ? S.accept : S.acceptLocked}</span>
        </label>
        <label className="flex items-start gap-2.5 text-[13px] text-mute">
          <input type="checkbox" name="email_opt_in" value="1" checked={emailOpt} onChange={(e) => setEmailOpt(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-white" />
          <span>{S.emailOpt}</span>
        </label>
        <label className="flex items-start gap-2.5 text-[13px] text-mute">
          <input type="checkbox" name="sms_opt_in" value="1" checked={smsOpt} onChange={(e) => setSmsOpt(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-white" />
          <span>{S.smsOpt}</span>
        </label>
        <AnimatePresence initial={false}>
          {smsOpt && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
              <div className="flex flex-col gap-2 pl-6.5 pt-1">
                <Field label={S.phone} hint={S.phoneHint}>
                  <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={S.phonePh} required />
                </Field>
                <p className="text-[11px] leading-relaxed text-dim">{S.smsConsent}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SubmitButton size="lg" pendingText={S.pending} disabled={!accepted}>{S.submit}</SubmitButton>
      <FormNote state={state} />
      <p className="text-center text-[13px] text-mute">
        {S.have} <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink">{S.loginLink}</Link>
      </p>
    </ActionForm>
  );
}
