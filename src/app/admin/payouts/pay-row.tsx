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
