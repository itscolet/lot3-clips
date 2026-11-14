"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { sendReset, signIn, type AuthState } from "../actions";
import { Field, Input } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { useT } from "@/lib/i18n/client";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const [resetState, resetAction] = useActionState<AuthState, FormData>(sendReset, null);
  const [reset, setReset] = useState(false);
  const t = useT();
  const L = t.login;

  if (reset)
    return (
      <ActionForm action={resetAction} className="flex flex-col gap-5">
        <h1 className="text-[30px] font-medium tracking-[-0.035em]">{L.resetTitle}</h1>
        <Field label={t.common.email}><Input name="email" type="email" required autoComplete="email" /></Field>
        <SubmitButton size="lg" pendingText={L.sending}>{L.sendReset}</SubmitButton>
        <FormNote state={resetState} />
        <button type="button" onClick={() => setReset(false)} className="text-[13px] text-mute hover:text-ink">{L.back}</button>
      </ActionForm>
    );

  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-medium tracking-[-0.035em]">{L.welcome}</h1>
        <p className="mt-1.5 text-[14px] text-mute">{L.sub}</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <Field label={t.common.email}><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label={t.common.password}><Input name="password" type="password" required autoComplete="current-password" /></Field>
      <SubmitButton size="lg" pendingText={L.pending}>{t.common.login}</SubmitButton>
      <FormNote state={state} />
      <div className="flex justify-between text-[13px]">
        <button type="button" onClick={() => setReset(true)} className="text-mute hover:text-ink">{L.forgot}</button>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ink">{L.create}</Link>
      </div>
    </ActionForm>
  );
}
