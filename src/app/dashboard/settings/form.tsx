"use client";
import { useActionState, useState } from "react";
import { saveProfile, type ActionState } from "../actions";
import { Field, Input, Button } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function ProfileForm({ username, displayName, email }: { username: string; displayName: string; email: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Username"><Input name="username" defaultValue={username} required /></Field>
      <Field label="Display name"><Input name="display_name" defaultValue={displayName} /></Field>
      <Field label="Email" className="sm:col-span-2"><Input value={email} disabled readOnly /></Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="Saving">Save</SubmitButton>
        <div className="flex-1"><FormNote state={state} /></div>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Field label="New password" hint="At least 8 characters.">
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          disabled={busy || pw.length < 8}
          onClick={async () => {
            setBusy(true);
            const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
            setBusy(false);
            setState(error ? { error: error.message } : { ok: true, message: "Password updated." });
            if (!error) setPw("");
          }}
        >
          {busy ? "Updating" : "Update password"}
        </Button>
        <div className="flex-1"><FormNote state={state} /></div>
      </div>
    </div>
  );
}
