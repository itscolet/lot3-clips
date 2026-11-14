"use client";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CampaignCard } from "@/components/site/campaign-card";
import { PlatformIcon } from "@/components/ui/icons";
import type { CampaignCard as CC, Platform } from "@/lib/types";
import { cn } from "@/lib/format";

const SORTS = { newest: "Newest", cpm: "Highest CPM", budget: "Most budget left" } as const;

export function Board({ cards }: { cards: CC[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"live" | "complete">("live");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [label, setLabel] = useState<string>("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("newest");

  const labels = useMemo(() => Array.from(new Set(cards.map((c) => c.label))), [cards]);
  const list = useMemo(() => {
    let l = cards.filter((c) => (tab === "live" ? c.status === "live" || c.status === "paused" : c.status === "complete"));
    if (platform !== "all") l = l.filter((c) => c.platforms.includes(platform));
    if (label !== "all") l = l.filter((c) => c.label === label);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((c) => c.title.toLowerCase().includes(s) || (c.artist ?? "").toLowerCase().includes(s));
    }
    if (sort === "cpm") l = [...l].sort((a, b) => b.cpm - a.cpm);
    if (sort === "budget") l = [...l].sort((a, b) => b.budget - b.spent - (a.budget - a.spent));
    return l;
  }, [cards, tab, platform, label, q, sort]);

  const chip = (active: boolean) =>
    cn(
      "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[12px] transition-colors duration-150 md:h-8",
      active ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:border-[#444] hover:text-ink",
    );
  const iconChip = (active: boolean) =>
    cn(
      "inline-flex size-9 shrink-0 items-center justify-center rounded-full border p-0 transition-colors duration-150 md:size-8",
      active ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:border-[#444] hover:text-ink",
    );

  return (
    <>
      <div className="sticky top-16 z-30 -mx-5 mt-8 flex flex-col gap-2.5 border-b border-line bg-black/85 px-5 py-3 backdrop-blur-xl md:mt-10 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 rounded-full border border-line2 p-0.5">
            {(["live", "complete"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className="relative h-8 rounded-full px-3.5 text-[12px] capitalize md:h-7">
                {tab === t && (
                  <motion.span layoutId="board-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                )}
                <span className={cn("relative", tab === t ? "text-black" : "text-mute")}>{t}</span>
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-9 min-w-0 flex-1 rounded-full border border-line2 bg-s1 px-3.5 text-[16px] outline-none placeholder:text-dim focus:border-[#555] md:h-8 md:w-48 md:flex-none md:text-[12px]"
          />
        </div>
        <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-1 md:px-0 [&::-webkit-scrollbar]:hidden">
          <button className={chip(platform === "all")} onClick={() => setPlatform("all")}>All platforms</button>
          {(["tiktok", "instagram", "youtube", "x"] as Platform[]).map((p) => (
            <button key={p} className={iconChip(platform === p)} onClick={() => setPlatform(p)} aria-label={p}>
              <PlatformIcon platform={p} className="block size-3.5" />
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-line2" />
          <button className={chip(label === "all")} onClick={() => setLabel("all")}>All</button>
          {labels.map((l) => (
            <button key={l} className={cn(chip(label === l), "capitalize")} onClick={() => setLabel(l)}>{l}</button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
            className="h-9 shrink-0 rounded-full border border-line2 bg-s1 px-3 text-[12px] text-mute outline-none md:ml-auto md:h-8"
            aria-label="Sort"
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <motion.div layout className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <CampaignCard c={c} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!list.length && (
        <p className="py-24 text-center text-[14px] text-mute">
          {cards.length ? "No campaigns match those filters." : "No open invitations yet. They show up here the moment a campaign goes live."}
        </p>
      )}
    </>
  );
}
