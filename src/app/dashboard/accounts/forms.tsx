"use client";
import { useActionState, useState } from "react";
import { connectAccount, removeAccount, uploadAudience, verifyAccount, type ActionState } from "../actions";
import { PlatformIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/motion";
import { Badge, Card, Input } from "@/components/ui/ui";
import { FormNote } from "@/components/ui/form-note";
import { compact, PLATFORM_LABEL, cn } from "@/lib/format";
import type { Platform, SocialAccount } from "@/lib/types";

export function ConnectForm() {
  const [state, action] = useActionState<ActionState, FormData>(connectAccount, null);
  const [platform, setPlatform] = useState<Platform>("tiktok");
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="platform" value={platform} />
      <div className="grid grid-cols-2 gap-2">
        {(["tiktok", "instagram"] as Platform[]).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setPlatform(p)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl border text-[13px] transition-colors duration-150",
              platform === p ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:text-ink",
            )}
          >
            <PlatformIcon platform={p} /> {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>
      <Input name="handle" placeholder="@yourhandle" required />
      <SubmitButton pendingText="Adding">Add account</SubmitButton>
      <FormNote state={state} />
    </form>
  );
}

export function AccountCard({ a }: { a: SocialAccount }) {
  const [vState, vAction] = useActionState<ActionState, FormData>(verifyAccount, null);
  const [uState, uAction] = useActionState<ActionState, FormData>(uploadAudience, null);
  const [copied, setCopied] = useState(false);
  const verified = !!a.verified_at;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-11 place-items-center rounded-full border border-line2 bg-s2">
          <PlatformIcon platform={a.platform} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium">@{a.handle}</div>
          <div className="text-[12px] text-dim">
            {PLATFORM_LABEL[a.platform]}
            {a.followers ? ` · ${compact(a.followers)} followers` : ""}
          </div>
        </div>
        {verified ? <Badge tone="solid">Verified</Badge> : <Badge tone="outline">Unverified</Badge>}
      </div>

      {!verified && (
        <div className="mt-5 rounded-xl border border-line bg-s2 p-4">
          <div className="text-[12px] text-mute">Put this code in your bio</div>
          <div className="mt-2 flex items-center gap-3">
            <code className="num rounded-lg border border-line2 bg-black px-3 py-2 text-[18px] tracking-[0.08em]">{a.verify_code}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(a.verify_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}
              className="text-[12px] text-mute transition-colors hover:text-ink"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <form action={vAction} className="ml-auto">
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton size="sm" pendingText="Checking bio">Verify</SubmitButton>
            </form>
          </div>
          <div className="mt-3"><FormNote state={vState} /></div>
          <form action={removeAccount} className="mt-3">
            <input type="hidden" name="id" value={a.id} />
            <button className="text-[12px] text-dim hover:text-ink">Remove account</button>
          </form>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-[13px]">
          <span className="text-mute">US audience: </span>
          {a.audience_status === "approved" && <span>Approved{a.us_audience_pct ? ` · ${a.us_audience_pct}% US` : ""}</span>}
          {a.audience_status === "pending" && <span>In review</span>}
          {a.audience_status === "rejected" && <span>Not approved — upload a clearer screenshot</span>}
          {a.audience_status === "none" && <span className="text-dim">Not submitted</span>}
        </div>
        {a.audience_status !== "approved" && (
          <form action={uAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={a.id} />
            <Input type="file" name="file" accept="image/*" className="h-9 w-56 py-1.5 text-[12px] file:mr-3 file:rounded-full file:border-0 file:bg-s3 file:px-3 file:py-1 file:text-[12px] file:text-ink" />
            <SubmitButton size="sm" variant="secondary" pendingText="Uploading">Upload</SubmitButton>
          </form>
        )}
      </div>
      {uState && <div className="mt-3"><FormNote state={uState} /></div>}
    </Card>
  );
}
