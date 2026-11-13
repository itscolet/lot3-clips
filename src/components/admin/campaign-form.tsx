"use client";
import { useActionState, useState } from "react";
import { saveCampaign, type AState } from "@/app/admin/actions";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/ui";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { PlatformIcon } from "@/components/ui/icons";
import { CampaignCover } from "@/components/site/campaign-card";
import { money, slugify, cn, PLATFORM_LABEL } from "@/lib/format";
import type { Campaign, Platform } from "@/lib/types";

export function CampaignForm({ c, clients }: { c?: Campaign; clients: { id: string; name: string }[] }) {
  const [state, action] = useActionState<AState, FormData>(saveCampaign, null);
  const [title, setTitle] = useState(c?.title ?? "");
  const [slug, setSlug] = useState(c?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!c);
  const [cpm, setCpm] = useState(String(c?.cpm ?? "2.00"));
  const [budget, setBudget] = useState(String(c?.budget ?? "4000"));
  const [platforms, setPlatforms] = useState<Platform[]>(c?.platforms ?? ["tiktok"]);
  const [cover, setCover] = useState<string | null>(c?.cover_url ?? null);
  const views = Number(cpm) > 0 ? (Number(budget) / Number(cpm)) * 1000 : 0;
  const toDate = (s: string | null | undefined) => (s ? s.slice(0, 10) : "");

  return (
    <ActionForm action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="flex flex-col gap-6">
        <Card className="grid gap-5 p-6 sm:grid-cols-2">
          <h3 className="text-[14px] font-medium sm:col-span-2">Basics</h3>
          <Field label="Title">
            <Input
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
            />
          </Field>
          <Field label="Artist / brand"><Input name="artist" defaultValue={c?.artist ?? ""} /></Field>
          <Field label="URL" hint={`lot3clips.com/campaigns/${slug || "…"}`}>
            <Input name="slug" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
          </Field>
          <Field label="Client">
            <Select name="client_id" defaultValue={c?.client_id ?? ""}>
              <option value="">—</option>
              {clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select name="label" defaultValue={c?.label ?? "music"}>
              {["music", "movie", "brand", "podcast", "sports", "other"].map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={c?.status ?? "draft"}>
              {["draft", "live", "paused", "complete"].map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
        </Card>

        <Card className="grid gap-5 p-6 sm:grid-cols-3">
          <h3 className="text-[14px] font-medium sm:col-span-3">Money</h3>
          <Field label="CPM (per 1K views)"><Input name="cpm" type="number" step="0.01" min="0.01" value={cpm} onChange={(e) => setCpm(e.target.value)} required /></Field>
          <Field label="Budget"><Input name="budget" type="number" step="1" min="1" value={budget} onChange={(e) => setBudget(e.target.value)} required /></Field>
          <Field label="Max per clip" hint="Optional cap"><Input name="max_payout_per_clip" type="number" step="0.01" defaultValue={c?.max_payout_per_clip ?? ""} /></Field>
          <div className="rounded-xl border border-line bg-s2 px-4 py-3 text-[13px] text-mute sm:col-span-3">
            This budget buys about <span className="num text-ink">{Math.round(views).toLocaleString()}</span> verified views at {money(Number(cpm) || 0)} CPM.
          </div>
        </Card>

        <Card className="grid gap-5 p-6">
          <h3 className="text-[14px] font-medium">Brief & rules</h3>
          <Field label="Brief" hint="What clippers should make. Line breaks are kept.">
            <Textarea name="description" defaultValue={c?.description ?? ""} rows={6} />
          </Field>
          <Field label="Content rules" hint="One rule per line.">
            <Textarea name="content_rules" defaultValue={(c?.content_rules ?? []).join("\n")} rows={4} />
          </Field>
          <Field label="Caption requirements"><Input name="caption_requirements" defaultValue={c?.caption_requirements ?? ""} placeholder="e.g. Tag @artist, #ad" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Sound link"><Input name="sound_url" type="url" defaultValue={c?.sound_url ?? ""} placeholder="https://www.tiktok.com/music/…" /></Field>
            <Field label="Footage / assets link"><Input name="assets_url" type="url" defaultValue={c?.assets_url ?? ""} placeholder="Dropbox, Drive…" /></Field>
          </div>
        </Card>

        <Card className="grid gap-5 p-6 sm:grid-cols-2">
          <h3 className="text-[14px] font-medium sm:col-span-2">Eligibility</h3>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-[12px] font-medium text-mute">Platforms</span>
            <div className="flex flex-wrap gap-2">
              {(["tiktok", "instagram", "youtube", "x"] as Platform[]).map((p) => {
                const on = platforms.includes(p);
                return (
                  <label key={p} className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-[13px] transition-colors duration-150", on ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:text-ink")}>
                    <input type="checkbox" name="platforms" value={p} checked={on} onChange={() => setPlatforms(on ? platforms.filter((x) => x !== p) : [...platforms, p])} className="hidden" />
                    <PlatformIcon platform={p} /> {PLATFORM_LABEL[p]}
                  </label>
                );
              })}
            </div>
            {platforms.some((p) => p === "youtube" || p === "x") && <span className="text-[11px] text-dim">YouTube and X views are entered manually for now.</span>}
          </div>
          <Field label="Territory">
            <Select name="territory" defaultValue={c?.territory ?? "US"}>
              <option value="US">US only (audience screenshot required)</option>
              <option value="Global">Global</option>
            </Select>
          </Field>
          <Field label="Minimum followers"><Input name="min_followers" type="number" min="0" defaultValue={c?.min_followers ?? 0} /></Field>
          <Field label="Start date"><Input name="starts_at" type="date" defaultValue={toDate(c?.starts_at)} /></Field>
          <Field label="End date"><Input name="ends_at" type="date" defaultValue={toDate(c?.ends_at)} /></Field>
          <input type="hidden" name="min_account_age_months" value={c?.min_account_age_months ?? 0} />
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
        <CampaignCover title={title || "Untitled"} slug={slug || "x"} cover={cover} className="aspect-[4/5] rounded-2xl border border-line" />
        <Card className="flex flex-col gap-3 p-5">
          <Field label="Cover image" hint="Shown in black & white. Leave empty for the generated cover.">
            <Input
              type="file"
              name="cover_file"
              accept="image/*"
              className="h-auto py-2 text-[12px] file:mr-3 file:rounded-full file:border-0 file:bg-s3 file:px-3 file:py-1 file:text-[12px] file:text-ink"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCover(URL.createObjectURL(f));
              }}
            />
          </Field>
          <input type="hidden" name="cover_url" value={cover?.startsWith("blob:") ? c?.cover_url ?? "" : cover ?? ""} />
          {cover && (
            <button type="button" onClick={() => setCover(null)} className="self-start text-[12px] text-dim hover:text-ink">Remove cover</button>
          )}
        </Card>
        <SubmitButton size="lg" pendingText="Saving">{c ? "Save changes" : "Create campaign"}</SubmitButton>
        <FormNote state={state} />
      </div>
    </ActionForm>
  );
}
