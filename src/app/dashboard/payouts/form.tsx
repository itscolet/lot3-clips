"use client";
import { useActionState } from "react";
import { savePayout, type ActionState } from "../actions";
import { Field, Input, Select } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";

export function PayoutForm({ method, handle }: { method: string; handle: string }) {
  const [state, action] = useActionState<ActionState, FormData>(savePayout, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Method">
        <Select name="method" defaultValue={method}>
          <option value="paypal">PayPal</option>
          <option value="zelle">Zelle</option>
          <option value="venmo">Venmo</option>
          <option value="cashapp">Cash App</option>
          <option value="wise">Wise</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Email, phone or handle" hint="Double-check it. Payments sent to wrong details can't be recovered.">
        <Input name="handle" defaultValue={handle} required />
      </Field>
      <SubmitButton pendingText="Saving">Save</SubmitButton>
      <FormNote state={state} />
    </form>
  );
}
