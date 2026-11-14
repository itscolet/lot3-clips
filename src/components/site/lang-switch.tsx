"use client";
import { motion } from "motion/react";
import { useId } from "react";
import { useLang, useSetLang, useT } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/dict";
import { cn } from "@/lib/format";

/** Compact EN / ES toggle. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const { set, pending } = useSetLang();
  const id = useId();
  return (
    <div
      role="group"
      aria-label={t.lang.switchAria}
      className={cn("flex shrink-0 rounded-full border border-line2 p-0.5", pending && "opacity-60", className)}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => l !== lang && set(l)}
          aria-pressed={l === lang}
          lang={l}
          className="relative h-7 rounded-full px-2.5 text-[11px] font-medium uppercase tracking-[0.06em]"
        >
          {l === lang && (
            <motion.span layoutId={`lang-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          <span className={cn("relative", l === lang ? "text-black" : "text-mute hover:text-ink")}>{l}</span>
        </button>
      ))}
    </div>
  );
}
