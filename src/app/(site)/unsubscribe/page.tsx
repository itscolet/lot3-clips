import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const [sp, { t }] = await Promise.all([searchParams, getT()]);
  const U = t.unsub;
  const ok = sp.done === "1";
  return (
    <div className="mx-auto max-w-[520px] px-5 pt-24 text-center">
      <h1 className="text-[32px] font-medium tracking-[-0.035em]">{ok ? U.title : U.invalid}</h1>
      {ok && <p className="mt-4 text-[14px] leading-relaxed text-mute">{U.body}</p>}
      <p className="mt-6 text-[13px] text-mute">{U.again}</p>
      <Link href="/dashboard/settings" className="mt-3 inline-block text-[13px] text-ink underline underline-offset-4">{U.settings}</Link>
    </div>
  );
}
