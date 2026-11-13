import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { compact, PLATFORM_LABEL, timeAgo } from "@/lib/format";
import type { SocialAccount } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { Card, Empty, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { reviewAccount } from "../actions";
import { AutoCheck } from "./auto-check";

export const metadata = { title: "Verification" };

type Acc = SocialAccount & { profiles: { id: string; username: string } | null };

export default async function VerificationPage() {
  const { supabase } = await requireAdmin();
  const [{ data: unverified }, { data: audience }] = await Promise.all([
    supabase.from("social_accounts").select("*, profiles(id,username)").is("verified_at", null).order("created_at"),
    supabase.from("social_accounts").select("*, profiles(id,username)").eq("audience_status", "pending").order("created_at"),
  ]);
  const aud = (audience ?? []) as Acc[];
  const signed = new Map<string, string>();
  await Promise.all(
    aud.map(async (a) => {
      if (!a.audience_screenshot_path) return;
      const { data } = await supabase.storage.from("audience").createSignedUrl(a.audience_screenshot_path, 3600);
      if (data?.signedUrl) signed.set(a.id, data.signedUrl);
    }),
  );
  const btn = "h-8 rounded-full px-3.5 text-[12px] font-medium transition-colors duration-150";

  return (
    <>
      <PageHead title="Verification" sub="Confirm account ownership and US audiences before clips count." />

      <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Bio code · {(unverified ?? []).length}</h2>
      {(unverified ?? []).length ? (
        <div className="flex flex-col gap-2">
          {((unverified ?? []) as Acc[]).map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <PlatformIcon platform={a.platform} className="size-4" />
              <div className="min-w-[180px] flex-1">
                <a href={a.platform === "tiktok" ? `https://www.tiktok.com/@${a.handle}` : `https://www.instagram.com/${a.handle}/`} target="_blank" className="text-[14px] font-medium hover:underline">
                  @{a.handle} ↗
                </a>
                <div className="flex items-center gap-2 text-[12px] text-dim">
                  <Link href={`/admin/clippers/${a.profiles?.id}`} className="hover:text-ink">{a.profiles?.username}</Link> · {PLATFORM_LABEL[a.platform]} · added {timeAgo(a.created_at)}
                  {a.is_test && <TestBadge />}
                </div>
              </div>
              <code className="num rounded-lg border border-line2 bg-black px-3 py-1.5 text-[14px] tracking-[0.08em]">{a.verify_code}</code>
              <AutoCheck id={a.id} />
              <form action={reviewAccount} className="flex items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <input name="followers" placeholder="Followers" className="h-8 w-24 rounded-full border border-line2 bg-s2 px-3 text-[12px] outline-none" />
                <button name="op" value="verify" className={`${btn} bg-ink text-black hover:bg-white`}>Mark verified</button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="No accounts waiting" />
      )}

      <h2 className="mb-4 mt-10 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">US audience screenshots · {aud.length}</h2>
      {aud.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {aud.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="grid aspect-[4/3] place-items-center bg-black">
                {signed.get(a.id) ? (
                  <a href={signed.get(a.id)} target="_blank" className="h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signed.get(a.id)} alt="Audience screenshot" className="h-full w-full object-contain" />
                  </a>
                ) : (
                  <span className="text-[12px] text-dim">No image</span>
                )}
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-[13px]">
                  <PlatformIcon platform={a.platform} />
                  <span className="font-medium">@{a.handle}</span>
                  <span className="text-dim">· {a.profiles?.username}{a.followers ? ` · ${compact(a.followers)}` : ""}</span>
                  {a.is_test && <TestBadge />}
                </div>
                <form action={reviewAccount} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <input name="us_pct" type="number" min="0" max="100" placeholder="US %" className="h-8 w-20 rounded-full border border-line2 bg-s2 px-3 text-[12px] outline-none" />
                  <button name="op" value="audience_approve" className={`${btn} bg-ink text-black hover:bg-white`}>Approve</button>
                  <button name="op" value="audience_reject" className={`${btn} border border-line2 text-mute hover:text-ink`}>Reject</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="No screenshots waiting" />
      )}
    </>
  );
}
