import { Banknote, LayoutGrid, Link2, Megaphone, Settings, Shield } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/site/shell";
import { signOut } from "./actions";
import { getT } from "@/lib/i18n/server";
import { LangSwitch } from "@/components/site/lang-switch";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const N = t.nav;
  const groups = [
    {
      items: [
        { href: "/dashboard", label: N.overview, short: N.home, icon: <LayoutGrid />, exact: true },
        { href: "/campaigns", label: N.invitations, short: N.invitesShort, icon: <Megaphone /> },
        { href: "/dashboard/accounts", label: N.accounts, short: N.accountsShort, icon: <Link2 /> },
        { href: "/dashboard/payouts", label: N.payouts, icon: <Banknote /> },
        { href: "/dashboard/settings", label: N.settings, icon: <Settings /> },
      ],
    },
    ...(profile.role === "admin" ? [{ title: N.team, items: [{ href: "/admin", label: N.adminPanel, icon: <Shield /> }] }] : []),
  ];
  return (
    <Shell
      id="dash"
      mobileTabs={["/dashboard", "/campaigns", "/dashboard/accounts", "/dashboard/payouts"]}
      groups={groups}
      labels={{ menu: t.common.menu, openMenu: t.common.openMenu, closeMenu: t.common.closeMenu, more: t.common.more }}
      footer={
        <>
        <div className="flex items-center justify-between px-2 pb-3 pt-1 text-[12px] text-dim">
          {t.lang.label}
          <LangSwitch />
        </div>
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="grid size-8 place-items-center rounded-full bg-ink text-[12px] font-semibold uppercase text-black">
            {profile.username.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]">{profile.username}</div>
            <div className="text-[11px] text-dim capitalize">{N.role[profile.role] ?? profile.role}</div>
          </div>
          <form action={signOut}>
            <button className="text-[12px] text-dim transition-colors hover:text-ink">{t.common.logout}</button>
          </form>
        </div>
        </>
      }
    >
      {children}
    </Shell>
  );
}
