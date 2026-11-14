"use client";
import { useActionState, useState } from "react";
import { saveProfile, type ActionState } from "../actions";
import { Field, Input, Button } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useT } from "@/lib/i18n/client";
import { authError } from "@/lib/i18n/dict";

export function ProfileForm({ username, displayName, email }: { username: string; displayName: string; email: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, null);
  const t = useT();
  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label={t.common.username}><Input name="username" defaultValue={username} required /></Field>
      <Field label={t.settings.displayName}><Input name="display_name" defaultValue={displayName} /></Field>
      <Field label={t.common.email} className="sm:col-span-2"><Input value={email} disabled readOnly /></Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText={t.common.saving}>{t.common.save}</SubmitButton>
        <div className="flex-1"><FormNote state={state} /></div>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();
  const S = t.settings;
  return (
    <div className="flex flex-col gap-4">
      <Field label={S.newPassword} hint={S.pwHint}>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          disabled={busy || pw.length < 8}
          onClick={async () => {
            setBusy(true);
            const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
            setBusy(false);
            setState(error ? { error: authError(error.message, t) } : { ok: true, message: S.updated });
            if (!error) setPw("");
          }}
        >
          {busy ? S.updating : S.update}
        </Button>
        <div className="flex-1"><FormNote state={state} /></div>
      </div>
    </div>
  );
}
