"use client";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/icons";
import { useLang, useSetLang } from "@/lib/i18n/client";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/format";

const OPTIONS: { lang: Lang; name: string; sub: string; code: string }[] = [
  { lang: "es", name: "Español", sub: "Continuar en español", code: "ES" },
  { lang: "en", name: "English", sub: "Continue in English", code: "EN" },
];

/** First-visit language picker. Shown until the visitor chooses; the choice is saved in a cookie. */
export function LanguagePrompt({ ask }: { ask: boolean }) {
  const path = usePathname();
  const guess = useLang();
  const { set } = useSetLang();
  const [open, setOpen] = useState(ask);
  const hidden = path.startsWith("/admin") || path.startsWith("/report") || path.startsWith("/auth");
  const show = open && !hidden;

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  const choose = (l: Lang) => {
    setOpen(false);
    set(l);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 px-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lang-title"
        >
          <motion.div
            className="grain relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-line2 bg-gradient-to-b from-[#161616] to-black p-7 sm:p-8"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative z-[2]">
              <Logo />
              <h2 id="lang-title" className="mt-7 text-[26px] font-medium leading-[1.05] tracking-[-0.035em]">
                Elige tu idioma
                <br />
                <span className="font-serif text-[24px] font-normal italic tracking-[-0.01em] text-mute">Choose your language</span>
              </h2>
              <div className="mt-7 flex flex-col gap-2.5">
                {OPTIONS.map((o) => (
                  <button
                    key={o.lang}
                    onClick={() => choose(o.lang)}
                    autoFocus={o.lang === guess}
                    lang={o.lang}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border px-4 py-4 text-left outline-none transition-[background,border,transform] duration-150 active:scale-[0.98]",
                      o.lang === guess
                        ? "border-ink bg-ink text-black"
                        : "border-line2 bg-s1 text-ink hover:border-[#555] focus-visible:border-[#555]",
                    )}
                  >
                    <span
                      className={cn(
                        "num grid size-10 shrink-0 place-items-center rounded-full text-[12px] font-semibold tracking-[0.06em]",
                        o.lang === guess ? "bg-black text-ink" : "border border-line2 text-mute",
                      )}
                    >
                      {o.code}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[16px] font-medium tracking-[-0.01em]">{o.name}</span>
                      <span className={cn("block text-[12px]", o.lang === guess ? "text-black/60" : "text-dim")}>{o.sub}</span>
                    </span>
                    <span className={cn("transition-transform duration-150 group-hover:translate-x-0.5", o.lang === guess ? "text-black" : "text-dim")}>→</span>
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[11px] leading-relaxed text-dim">
                Puedes cambiarlo cuando quieras desde el menú.
                <br />
                You can change this anytime from the menu.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
