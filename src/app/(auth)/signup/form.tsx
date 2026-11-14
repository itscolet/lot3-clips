"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";
import { Field, Input } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { useT } from "@/lib/i18n/client";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  const t = useT();
  const S = t.signup;
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
      <label className="flex items-start gap-2.5 text-[13px] text-mute">
        <input type="checkbox" name="agree" className="mt-0.5 accent-white" />
        <span>
          {S.agreeA}<Link href="/terms" target="_blank" className="text-ink underline underline-offset-2">{S.agreeLink}</Link>{S.agreeB}
        </span>
      </label>
      <SubmitButton size="lg" pendingText={S.pending}>{S.submit}</SubmitButton>
      <FormNote state={state} />
      <p className="text-center text-[13px] text-mute">
        {S.have} <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink">{S.loginLink}</Link>
      </p>
    </ActionForm>
  );
}
