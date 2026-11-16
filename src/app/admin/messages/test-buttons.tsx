"use client";
import { useActionState } from "react";
import { test, type MsgState } from "./actions";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";

export function TestButtons() {
  const [state, action] = useActionState<MsgState, FormData>(test, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <SubmitButton size="sm" variant="secondary" name="channel" value="email" pendingText="Sending">Send me a test email</SubmitButton>
      <SubmitButton size="sm" variant="secondary" name="channel" value="sms" pendingText="Sending">Send me a test text</SubmitButton>
      <FormNote state={state} />
    </form>
  );
}
