"use client";
import { useActionState } from "react";
import { savePayout, type ActionState } from "../actions";
import { Field, Input, Select } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { useT } from "@/lib/i18n/client";

export function PayoutForm({ method, handle }: { method: string; handle: string }) {
  const [state, action] = useActionState<ActionState, FormData>(savePayout, null);
  const t = useT();
  const P = t.payouts;
  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <Field label={P.method}>
        <Select name="method" defaultValue={method}>
          <option value="paypal">PayPal</option>
          <option value="zelle">Zelle</option>
          <option value="venmo">Venmo</option>
          <option value="cashapp">Cash App</option>
          <option value="wise">Wise</option>
          <option value="other">{P.other}</option>
        </Select>
      </Field>
      <Field label={P.handle} hint={P.handleHint}>
        <Input name="handle" defaultValue={handle} required />
      </Field>
      <SubmitButton pendingText={t.common.saving}>{t.common.save}</SubmitButton>
      <FormNote state={state} />
    </ActionForm>
  );
}
