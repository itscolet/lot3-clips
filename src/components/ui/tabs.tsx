"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

export function Tabs({ tabs, id = "tabs" }: { tabs: { key: string; label: ReactNode; content: ReactNode }[]; id?: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active);
  return (
    <div>
      <div className="flex gap-1 rounded-full border border-line bg-s1 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className="relative h-9 flex-1 rounded-full text-[13px] font-medium"
          >
            {active === t.key && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className={cn("relative transition-colors duration-150", active === t.key ? "text-black" : "text-mute hover:text-ink")}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5"
        >
          {current?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
