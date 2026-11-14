"use client";
import Link from "next/link";
import { compact, money0, money } from "@/lib/format";
import type { CampaignCard as Card, Platform } from "@/lib/types";
import { PlatformIcon } from "@/components/ui/icons";
import { TestBadge } from "@/components/ui/ui";
import { useT } from "@/lib/i18n/client";
import { tLabel, tStatus } from "@/lib/i18n/dict";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function CampaignCover({
  title,
  slug,
  cover,
  label,
  className = "",
  big = false,
}: {
  title: string;
  slug: string;
  cover: string | null;
  label?: string;
  className?: string;
  big?: boolean;
}) {
  const t = useT();
  const h = hash(slug);
  const x = 20 + (h % 60);
  const y = 15 + ((h >> 3) % 50);
  const angle = (h >> 5) % 180;
  return (
    <div className={`grain relative overflow-hidden bg-[#0b0b0b] ${className}`}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover grayscale contrast-[1.08] transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.06]"
            style={{
              background: `radial-gradient(120% 90% at ${x}% ${y}%, #3a3a3a 0%, #151515 38%, #050505 75%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: `repeating-linear-gradient(${angle}deg, #fff 0 1px, transparent 1px 22px)`,
              maskImage: "linear-gradient(180deg, transparent, #000 40%, transparent)",
            }}
          />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
      <div className="absolute inset-x-0 top-0 z-[2] p-3 sm:p-4">
        {label && <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-mute">{tLabel(t, label)}</span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-4">
        <span
          className={`block font-serif leading-[0.92] tracking-[-0.01em] text-ink ${big ? "text-[44px] md:text-[56px]" : "text-[26px] sm:text-[34px]"}`}
        >
          {title}
        </span>
      </div>
    </div>
  );
}

export function PlatformRow({ platforms }: { platforms: Platform[] }) {
  return (
    <span className="flex items-center gap-1.5 text-mute">
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} className="size-3.5" />
      ))}
    </span>
  );
}

export function CampaignCard({ c }: { c: Card }) {
  const t = useT();
  const left = Math.max(0, Number(c.budget) - Number(c.spent));
  const pct = Math.min(100, (Number(c.spent) / Number(c.budget)) * 100);
  return (
    <Link
      href={`/campaigns/${c.slug}`}
      className="group sweep block overflow-hidden rounded-2xl border border-line bg-s1 transition-[border,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#3a3a3a]"
    >
      <CampaignCover title={c.title} slug={c.slug} cover={c.cover_url} label={c.label} className="aspect-[4/5]" />
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {c.status === "live" ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
                <span className="live-dot size-1.5 rounded-full bg-ink" /> {t.card.live}
              </span>
            ) : (
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-dim">{tStatus(t, c.status)}</span>
            )}
            {c.is_test && <TestBadge />}
          </div>
          <PlatformRow platforms={c.platforms} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="num text-[20px] leading-none sm:text-[22px]">{money(c.cpm)}</div>
            <div className="mt-1 text-[11px] text-dim">{t.card.per1k}</div>
          </div>
          <div className="sm:text-right">
            <div className="num text-[13px] text-ink">{money0(left)}</div>
            <div className="mt-1 text-[11px] text-dim">{t.card.left(money0(c.budget))}</div>
          </div>
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-s3">
          <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-dim">
          <span>{t.card.views(compact(c.total_views))}</span>
          <span>{c.territory === "US" ? t.common.usOnly : c.territory}</span>
        </div>
      </div>
    </Link>
  );
}
