"use client";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

/** Re-fetch server data every few seconds while the tab is visible, so new replies show up on their own. */
export function AutoRefresh({ every = 15000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const id = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Message text with line breaks kept and links clickable. */
export function MessageText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </p>
  );
}

/** Textarea that grows with its content. Cmd/Ctrl+Enter submits the form. */
export function AutoTextarea({
  className,
  minRows = 3,
  maxRows = 14,
  onValue,
  value,
  ref: outerRef,
  ...p
}: React.ComponentProps<"textarea"> & { minRows?: number; maxRows?: number; onValue?: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const pad = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
    el.style.height = `${Math.min(Math.max(el.scrollHeight, line * minRows + pad), line * maxRows + pad)}px`;
  }, [value, minRows, maxRows]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (typeof outerRef === "function") outerRef(el);
        else if (outerRef) outerRef.current = el;
      }}
      value={value}
      rows={minRows}
      onChange={(e) => onValue?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
      }}
      {...p}
      className={cn(
        "w-full resize-none rounded-xl border border-line2 bg-s2 px-3.5 py-3 text-[16px] leading-[1.5] text-ink outline-none transition-[border,background] duration-150 placeholder:text-dim focus:border-[#555] focus:bg-s3 md:text-[14px]",
        className,
      )}
    />
  );
}

/** Small "attach screenshot" picker with a filename chip. */
export function AttachPicker({ label, removeLabel, name = "file" }: { label: string; removeLabel: string; name?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        ref={ref}
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp,image/heic,image/gif"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
      />
      {file ? (
        <span className="flex min-w-0 items-center gap-2 rounded-full border border-line2 bg-s2 py-1 pl-3 pr-1 text-[12px] text-mute">
          <span className="truncate">{file}</span>
          <button
            type="button"
            onClick={() => {
              if (ref.current) ref.current.value = "";
              setFile(null);
            }}
            className="rounded-full px-2 py-0.5 text-dim hover:bg-s3 hover:text-ink"
          >
            {removeLabel}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-9 items-center gap-1.5 rounded-full border border-line2 px-3 text-[12px] text-mute transition-colors hover:border-[#555] hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          {label}
        </button>
      )}
    </div>
  );
}

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="h-9 shrink-0 rounded-full bg-ink px-4 text-[12px] font-medium text-black transition-transform active:scale-[0.97]"
    >
      {copied ? done : label}
    </button>
  );
}
