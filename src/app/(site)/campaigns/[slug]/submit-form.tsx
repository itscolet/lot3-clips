"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { submitClip, type ActionState } from "@/app/dashboard/actions";
import { PlatformIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/motion";
import { Input, LinkButton } from "@/components/ui/ui";
import { FormNote } from "@/components/ui/form-note";
import type { Platform, SocialAccount } from "@/lib/types";

export function SubmitClipForm({
  campaignId,
  slug,
  platforms,
  accounts,
  usOnly,
}: {
  campaignId: string;
  slug: string;
  platforms: Platform[];
  accounts: SocialAccount[];
  usOnly: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(submitClip, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  const eligible = accounts.filter(
    (a) => platforms.includes(a.platform) && a.verified_at && (!usOnly || a.audience_status === "approved"),
  );

  if (!eligible.length) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-[13px] leading-relaxed text-mute">
          Connect and verify a {platforms.map((p) => p).join(" or ")} account
          {usOnly ? ", and get your US audience screenshot approved," : ""} to submit clips.
        </p>
        <LinkButton href="/dashboard/accounts">Connect account</LinkButton>
      </div>
    );
  }

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="slug" value={slug} />
      <span className="text-[12px] font-medium text-mute">Posted from</span>
      <div className="flex flex-col gap-1.5">
        {eligible.map((a, i) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line2 px-3.5 py-2.5 text-[13px] transition-colors has-[:checked]:border-ink has-[:checked]:bg-s3"
          >
            <input type="radio" name="account_id" value={a.id} defaultChecked={i === 0} className="accent-white" />
            <PlatformIcon platform={a.platform} />@{a.handle}
          </label>
        ))}
      </div>
      <Input name="url" placeholder="https://www.tiktok.com/@you/video/…" required />
      <SubmitButton pendingText="Submitting">Submit clip</SubmitButton>
      <FormNote state={state} />
      <p className="text-center text-[11px] text-dim">
        By submitting you agree to the <Link href="/terms" className="underline underline-offset-2">rules</Link>.
      </p>
    </form>
  );
}
