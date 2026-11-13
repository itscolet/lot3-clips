import { Banknote, LayoutGrid, Link2, Megaphone, Settings, Shield } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/site/shell";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const groups = [
    {
      items: [
        { href: "/dashboard", label: "Overview", icon: <LayoutGrid />, exact: true },
        { href: "/campaigns", label: "Campaigns", icon: <Megaphone /> },
        { href: "/dashboard/accounts", label: "Connected accounts", icon: <Link2 /> },
        { href: "/dashboard/payouts", label: "Payouts", icon: <Banknote /> },
        { href: "/dashboard/settings", label: "Settings", icon: <Settings /> },
      ],
    },
    ...(profile.role === "admin" ? [{ title: "Team", items: [{ href: "/admin", label: "Admin panel", icon: <Shield /> }] }] : []),
  ];
  return (
    <Shell
      id="dash"
      groups={groups}
      footer={
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="grid size-8 place-items-center rounded-full bg-ink text-[12px] font-semibold uppercase text-black">
            {profile.username.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]">{profile.username}</div>
            <div className="text-[11px] text-dim capitalize">{profile.role}</div>
          </div>
          <form action={signOut}>
            <button className="text-[12px] text-dim transition-colors hover:text-ink">Log out</button>
          </form>
        </div>
      }
    >
      {children}
    </Shell>
  );
}
