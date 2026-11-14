"use client";
import { useState, useTransition } from "react";
import { autoCheckBio } from "./check-action";

export function AutoCheck({ id }: { id: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await autoCheckBio(id);
            setMsg(r);
          })
        }
        className="h-10 rounded-full border border-line2 px-3.5 text-[12px] text-mute transition-colors hover:text-ink disabled:opacity-40 md:h-8"
      >
        {pending ? "Checking bio…" : "Check bio"}
      </button>
      {msg && <span className="max-w-[220px] text-[11px] text-mute">{msg}</span>}
    </div>
  );
}
