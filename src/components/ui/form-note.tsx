"use client";
import { AnimatePresence, motion } from "motion/react";

export function FormNote({ state }: { state: { ok?: boolean; error?: string; message?: string } | null }) {
  const text = state?.error ?? state?.message;
  return (
    <AnimatePresence initial={false}>
      {text && (
        <motion.p
          key={text}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={`rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed ${
            state?.error ? "border-line2 bg-s2 text-ink" : "border-ink/30 bg-ink/[0.06] text-ink"
          }`}
          role={state?.error ? "alert" : "status"}
        >
          {state?.error ? "⚠ " : "✓ "}
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
