import type { Dict } from "@/lib/i18n/dict";
import { cn } from "@/lib/format";

/** The terms, as numbered sections of short bullets. `compact` is the signup scroll box version. */
export function TermsBody({ T, compact = false }: { T: Dict["terms"]; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-5" : "gap-10")}>
      {T.sections.map(([title, items], i) => (
        <section key={title} className={cn(!compact && "grid gap-4 md:grid-cols-[48px_1fr]")}>
          {!compact && <span className="num text-[12px] text-dim">{String(i + 1).padStart(2, "0")}</span>}
          <div>
            <h3 className={cn("font-medium tracking-[-0.015em]", compact ? "text-[13px] text-ink" : "text-[18px] tracking-[-0.02em]")}>
              {compact && <span className="num mr-2 text-[11px] text-dim">{String(i + 1).padStart(2, "0")}</span>}
              {title}
            </h3>
            <ul className={cn("flex flex-col", compact ? "mt-2 gap-1.5" : "mt-3 gap-2.5")}>
              {items.map((p) => (
                <li key={p} className={cn("relative pl-3.5 leading-relaxed text-mute", compact ? "text-[12px]" : "text-[14px]")}>
                  <span className="absolute left-0 top-[0.62em] size-1 rounded-full bg-dim" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
