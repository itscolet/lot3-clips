import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { TermsBody } from "@/components/site/terms-body";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.terms };
}

export default async function Terms() {
  const { t } = await getT();
  const T = t.terms;
  return (
    <div className="mx-auto max-w-[760px] px-5 pt-16">
      <h1 className="text-[44px] font-medium tracking-[-0.04em]">{T.title}</h1>
      <p className="mt-2 text-[13px] text-dim">{T.updated}</p>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-mute">{T.intro}</p>
      {T.notice && <p className="mt-4 rounded-xl border border-line2 bg-s1 px-4 py-3 text-[12px] leading-relaxed text-mute">{T.notice}</p>}
      <div className="mt-12">
        <TermsBody T={T} />
      </div>
    </div>
  );
}
