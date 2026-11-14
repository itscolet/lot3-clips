"use client";
import Link from "next/link";
import { useActionState } from "react";
import { recordPayout, type AState } from "../actions";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { TestBadge } from "@/components/ui/ui";
import { Td, Tr } from "@/components/admin/table";
import { money } from "@/lib/format";
import type { LedgerRow } from "./page";

export function PayRow({ l }: { l: LedgerRow }) {
  const [state, action] = useActionState<AState, FormData>(recordPayout, null);
  return (
    <Tr>
      <Td><Link href={`/admin/clippers/${l.user_id}`} className="font-medium hover:underline">{l.username}</Link></Td>
      <Td><Link href={`/admin/campaigns/${l.campaign_id}`} className="text-mute hover:text-ink">{l.campaign_title}</Link> {l.is_test && <TestBadge />}</Td>
      <Td>
        {l.handle ? (
          <span className="text-[12px]"><span className="uppercase text-dim">{l.method}</span> <span className="font-mono">{l.handle}</span></span>
        ) : (
          <span className="text-[12px] text-dim">No payout details</span>
        )}
      </Td>
      <Td className="num text-right text-mute">{money(l.earned)}</Td>
      <Td className="num text-right text-mute">{money(l.paid)}</Td>
      <Td className="num text-right font-medium">{money(l.owed)}</Td>
      <Td>
        {state?.ok ? (
          <span className="block text-right text-[12px] text-mute">✓ {state.message}</span>
        ) : (
          <ActionForm action={action} className="flex items-center justify-end gap-1.5">
            <input type="hidden" name="user_id" value={l.user_id} />
            <input type="hidden" name="campaign_id" value={l.campaign_id} />
            <input type="hidden" name="method" value={l.method ?? ""} />
            <input type="hidden" name="is_test" value={String(l.is_test)} />
            <input name="amount" type="number" step="0.01" defaultValue={Number(l.owed).toFixed(2)} className="num h-8 w-24 rounded-full border border-line2 bg-s2 px-3 text-right text-[12px] outline-none" />
            <input name="reference" placeholder="Txn ID" className="h-8 w-24 rounded-full border border-line2 bg-s2 px-3 text-[12px] outline-none" />
            <SubmitButton size="sm" pendingText="…">Mark paid</SubmitButton>
          </ActionForm>
        )}
        {state?.error && <div className="mt-1 text-right text-[11px] text-mute">{state.error}</div>}
      </Td>
    </Tr>
  );
}

export function PayCard({ l }: { l: LedgerRow }) {
  const [state, action] = useActionState<AState, FormData>(recordPayout, null);
  return (
    <div className="rounded-2xl border border-line bg-s1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/clippers/${l.user_id}`} className="block truncate text-[15px] font-medium">{l.username}</Link>
          <div className="mt-0.5 flex items-center gap-2 truncate text-[12px] text-dim">{l.campaign_title} {l.is_test && <TestBadge />}</div>
        </div>
        <div className="text-right">
          <div className="num text-[18px]">{money(l.owed)}</div>
          <div className="text-[11px] text-dim">owed</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-s2 px-3 py-2 text-[12px]">
        {l.handle ? (
          <><span className="uppercase text-dim">{l.method}</span> <span className="break-all font-mono">{l.handle}</span></>
        ) : (
          <span className="text-dim">No payout details yet</span>
        )}
      </div>
      {state?.ok ? (
        <p className="mt-3 text-[12px] text-mute">✓ {state.message}</p>
      ) : (
        <ActionForm action={action} className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
          <input type="hidden" name="user_id" value={l.user_id} />
          <input type="hidden" name="campaign_id" value={l.campaign_id} />
          <input type="hidden" name="method" value={l.method ?? ""} />
          <input type="hidden" name="is_test" value={String(l.is_test)} />
          <input name="amount" type="number" step="0.01" inputMode="decimal" defaultValue={Number(l.owed).toFixed(2)} aria-label="Amount" className="num h-11 rounded-xl border border-line2 bg-s2 px-3 text-right text-[16px] outline-none" />
          <input name="reference" placeholder="Txn ID" aria-label="Transaction reference" className="h-11 rounded-xl border border-line2 bg-s2 px-3 text-[16px] outline-none" />
          <SubmitButton className="col-span-2" pendingText="Recording">Mark paid</SubmitButton>
        </ActionForm>
      )}
      {state?.error && <div className="mt-2 text-[12px] text-mute">{state.error}</div>}
    </div>
  );
}
