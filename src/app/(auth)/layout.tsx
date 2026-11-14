import Link from "next/link";
import { Logo } from "@/components/ui/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="grain relative hidden overflow-hidden border-r border-line lg:block">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(90% 70% at 30% 20%, #2e2e2e 0%, #0e0e0e 45%, #000 80%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "repeating-linear-gradient(115deg,#fff 0 1px,transparent 1px 26px)" }}
        />
        <div className="relative z-[2] flex h-full flex-col justify-between p-12">
          <Link href="/"><Logo /></Link>
          <div>
            <p className="font-serif text-[64px] leading-[0.95] tracking-[-0.01em]">
              Your clips.
              <br />
              <span className="italic text-mute">Paid per view.</span>
            </p>
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-mute">
              Invite-only music, film and brand campaigns from LOT3 Media. Post on your own page, keep your audience, get paid for the views.
            </p>
          </div>
        </div>
      </div>
      <div className="page-enter flex flex-col justify-center px-6 py-14 sm:px-16">
        <Link href="/" className="mb-12 lg:hidden"><Logo /></Link>
        <div className="mx-auto w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
