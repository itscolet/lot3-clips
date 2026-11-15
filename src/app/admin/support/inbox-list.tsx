"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { bulkTickets } from "./actions";
import { TestBadge } from "@/components/ui/ui";
import { cn, timeAgo } from "@/lib/format";

export type InboxRow = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  tags: string[];
  lang: string;
  preview: string | null;
  last_message_at: string;
  last_message_from: string | null;
  unread_admin: boolean;
  message_count: number;
  guest_name: string | null;
  guest_email: string | null;
  is_test: boolean;
  created_at: string;
  assigned_to: string | null;
  user_id: string | null;
  profiles: { id: string; username: string } | null;
};

const OVERDUE_MS = 24 * 36e5;

export function InboxList({ items, selected, hrefFor, emptyLabel }: { items: InboxRow[]; selected: number | null; hrefFor: Record<number, string>; emptyLabel: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now());

  // J / K moves through the list
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "j" && e.key !== "k") return;
      if (!items.length) return;
      const idx = items.findIndex((i) => i.number === selected);
      const next = e.key === "j" ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx === -1 ? 0 : idx - 1);
      const target = items[next];
      if (target) {
        e.preventDefault();
        router.push(hrefFor[target.number], { scroll: false });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [items, selected, hrefFor, router]);

  const bulk = (action: string) =>
    start(async () => {
      const fd = new FormData();
      checked.forEach((id) => fd.append("id", id));
      fd.set("action", action);
      await bulkTickets(fd);
      setChecked(new Set());
    });

  if (!items.length) return <p className="rounded-2xl border border-dashed border-line2 px-6 py-16 text-center text-[13px] text-mute">{emptyLabel}</p>;

  return (
    <div className="flex flex-col gap-1.5 lg:sticky lg:top-8 lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto lg:pb-6 lg:[scrollbar-width:thin]">
      <div className="sticky top-0 z-10 mb-1 flex h-9 items-center gap-2 bg-black px-1 text-[12px] text-mute">
        <input
          type="checkbox"
          aria-label="Select all"
          className="accent-white"
          checked={checked.size === items.length && items.length > 0}
          onChange={(e) => setChecked(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
        />
        {checked.size ? (
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <span className="shrink-0 pr-1">{checked.size} selected</span>
            <BulkBtn onClick={() => bulk("resolve")} disabled={pending} solid>Resolve</BulkBtn>
            <BulkBtn onClick={() => bulk("read")} disabled={pending}>Mark read</BulkBtn>
            <BulkBtn onClick={() => bulk("unread")} disabled={pending}>Unread</BulkBtn>
            <BulkBtn onClick={() => bulk("reopen")} disabled={pending}>Reopen</BulkBtn>
          </div>
        ) : (
          <span>{items.length} conversation{items.length === 1 ? "" : "s"}</span>
        )}
      </div>

      {items.map((it) => {
        const who = it.profiles?.username ? `@${it.profiles.username}` : it.guest_name ?? it.guest_email ?? "Visitor";
        const overdue = it.status === "open" && now - new Date(it.last_message_at).getTime() > OVERDUE_MS;
        const active = it.number === selected;
        return (
          <div
            key={it.id}
            className={cn(
              "group relative flex gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-100",
              active ? "border-[#4a4a4a] bg-s3" : it.unread_admin ? "border-line2 bg-s2 hover:bg-s3" : "border-line bg-s1 hover:bg-s2",
            )}
          >
            <input
              type="checkbox"
              aria-label={`Select #${it.number}`}
              className="relative z-[2] mt-1 shrink-0 accent-white"
              checked={checked.has(it.id)}
              onChange={(e) => {
                const n = new Set(checked);
                if (e.target.checked) n.add(it.id);
                else n.delete(it.id);
                setChecked(n);
              }}
            />
            <Link href={hrefFor[it.number]} scroll={false} className="absolute inset-0 z-[1] rounded-xl" aria-label={`Open #${it.number} ${it.subject}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12px]">
                {it.unread_admin && <span className="size-1.5 shrink-0 rounded-full bg-ink" />}
                <span className={cn("truncate", it.unread_admin ? "font-medium text-ink" : "text-mute")}>{who}</span>
                {!it.user_id && <Chip>Visitor</Chip>}
                {it.lang === "es" && <Chip>ES</Chip>}
                {it.is_test && <TestBadge />}
                <span className={cn("ml-auto shrink-0 text-[11px]", overdue ? "font-medium text-ink" : "text-dim")}>
                  {overdue ? "24h+ · " : ""}
                  {timeAgo(it.last_message_at)}
                </span>
              </div>
              <div className={cn("mt-1 truncate text-[13px]", it.unread_admin ? "font-medium text-ink" : "text-ink/90")}>{it.subject}</div>
              <div className="mt-0.5 truncate text-[12px] text-dim">
                {it.last_message_from === "admin" ? "You: " : ""}
                {it.preview}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {(it.priority === "urgent" || it.priority === "high") && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]", it.priority === "urgent" ? "bg-ink text-black" : "border border-ink/60 text-ink")}>
                    {it.priority}
                  </span>
                )}
                <Chip>{it.category}</Chip>
                {it.tags.map((t) => (
                  <Chip key={t}>#{t}</Chip>
                ))}
                {it.status === "waiting" && <Chip>waiting</Chip>}
                {it.status === "resolved" && <Chip>resolved</Chip>}
                <span className="num ml-auto text-[10px] text-dim">#{it.number}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-line2 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-mute">{children}</span>;
}

function BulkBtn({ children, solid, ...p }: React.ComponentProps<"button"> & { solid?: boolean }) {
  return (
    <button {...p} className={cn("h-7 shrink-0 rounded-full px-3 text-[11px] font-medium disabled:opacity-40", solid ? "bg-ink text-black" : "border border-line2 text-mute hover:text-ink")}>
      {children}
    </button>
  );
}
