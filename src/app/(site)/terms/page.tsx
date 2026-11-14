import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

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
      {T.notice && <p className="mt-4 rounded-xl border border-line2 bg-s1 px-4 py-3 text-[12px] leading-relaxed text-mute">{T.notice}</p>}
      <div className="mt-12 flex flex-col gap-12">
        {T.sections.map(([title, ps], i) => (
          <section key={title} className="grid gap-4 md:grid-cols-[48px_1fr]">
            <span className="num text-[12px] text-dim">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-[18px] font-medium tracking-[-0.02em]">{title}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {ps.map((p) => (
                  <p key={p} className="text-[14px] leading-relaxed text-mute">{p}</p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
