import Link from "next/link";
import { PlatformIcon } from "@/components/ui/icons";
import { dict, timeAgoL, type Lang } from "@/lib/i18n/dict";
import type { Platform } from "@/lib/types";

export type ActivityRow = {
  id: string;
  username: string;
  platform: Platform;
  campaign_title: string;
  campaign_slug: string;
  status: string;
  created_at: string;
};

const mask = (u: string) => (u.length <= 3 ? u : u[0] + "•••" + u.slice(-1));

export function ActivityTicker({ rows, lang = "en" }: { rows: ActivityRow[]; lang?: Lang }) {
  if (!rows.length) return null;
  const t = dict(lang);
  const items = [...rows, ...rows];
  return (
    <div className="relative overflow-hidden border-y border-line py-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="marquee flex w-max gap-10">
        {items.map((r, i) => (
          <span key={r.id + i} className="flex items-center gap-2.5 text-[12px] text-mute">
            <PlatformIcon platform={r.platform} className="size-3 text-ink" />
            <span className="text-ink">{mask(r.username)}</span>
            {t.activity.submittedTo}
            <span className="text-ink">{r.campaign_title}</span>
            <span className="text-dim">{timeAgoL(r.created_at, lang)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ActivityTable({ rows, showCampaign = true, lang = "en" }: { rows: ActivityRow[]; showCampaign?: boolean; lang?: Lang }) {
  const t = dict(lang);
  if (!rows.length) return <p className="py-8 text-center text-[13px] text-dim">{t.activity.none}</p>;
  return (
    <div className="divide-y divide-line">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-4 py-3 text-[13px]">
          <span className="grid size-8 place-items-center rounded-full border border-line2 bg-s2">
            <PlatformIcon platform={r.platform} className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate">
            <span className="text-ink">{mask(r.username)}</span>
            <span className="text-mute">{t.activity.submittedClip}</span>
            {showCampaign && (
              <>
                <span className="text-mute">{t.activity.to}</span>
                <Link href={`/campaigns/${r.campaign_slug}`} className="text-ink hover:underline">
                  {r.campaign_title}
                </Link>
              </>
            )}
          </span>
          <span className="num text-[12px] text-dim">{timeAgoL(r.created_at, lang)}</span>
        </div>
      ))}
    </div>
  );
}
