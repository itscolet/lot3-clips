"use client";
import { useActionState, useEffect, useRef } from "react";
import { saveClient, type AState } from "../actions";
import { Field, Input, Textarea } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";

export function ClientForm() {
  const [state, action] = useActionState<AState, FormData>(saveClient, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-4">
      <Field label="Name"><Input name="name" required placeholder="Artist, label or brand" /></Field>
      <Field label="Contact"><Input name="contact" placeholder="WhatsApp / email" /></Field>
      <Field label="Notes"><Textarea name="notes" rows={3} /></Field>
      <SubmitButton pendingText="Saving">Add client</SubmitButton>
      <FormNote state={state} />
    </form>
  );
}
