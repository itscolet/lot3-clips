"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { sendReset, signIn, type AuthState } from "../actions";
import { Field, Input } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const [resetState, resetAction] = useActionState<AuthState, FormData>(sendReset, null);
  const [reset, setReset] = useState(false);

  if (reset)
    return (
      <ActionForm action={resetAction} className="flex flex-col gap-5">
        <h1 className="text-[30px] font-medium tracking-[-0.035em]">Reset password</h1>
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
        <SubmitButton size="lg" pendingText="Sending">Send reset link</SubmitButton>
        <FormNote state={resetState} />
        <button type="button" onClick={() => setReset(false)} className="text-[13px] text-mute hover:text-ink">← Back to log in</button>
      </ActionForm>
    );

  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-medium tracking-[-0.035em]">Welcome back</h1>
        <p className="mt-1.5 text-[14px] text-mute">Log in to your LOT3 Clips account.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password"><Input name="password" type="password" required autoComplete="current-password" /></Field>
      <SubmitButton size="lg" pendingText="Logging in">Log in</SubmitButton>
      <FormNote state={state} />
      <div className="flex justify-between text-[13px]">
        <button type="button" onClick={() => setReset(true)} className="text-mute hover:text-ink">Forgot password?</button>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ink">Create account →</Link>
      </div>
    </ActionForm>
  );
}
