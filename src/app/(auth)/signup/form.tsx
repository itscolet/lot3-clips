"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";
import { Field, Input } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-medium tracking-[-0.035em]">Get invited to campaigns</h1>
        <p className="mt-1.5 text-[14px] text-mute">Create your account and verify your page. Your invitations show up right after.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <Field label="Username" hint="Shown on leaderboards.">
        <Input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_.]+" autoComplete="username" />
      </Field>
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2.5 text-[13px] text-mute">
        <input type="checkbox" name="agree" className="mt-0.5 accent-white" />
        <span>
          I agree to the <Link href="/terms" target="_blank" className="text-ink underline underline-offset-2">terms & rules</Link>, including the no-bots policy.
        </span>
      </label>
      <SubmitButton size="lg" pendingText="Creating account">Create account & get invited</SubmitButton>
      <FormNote state={state} />
      <p className="text-center text-[13px] text-mute">
        Have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink">Log in</Link>
      </p>
    </ActionForm>
  );
}
