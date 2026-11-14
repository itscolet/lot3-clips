import {
  Activity,
  Banknote,
  Building2,
  FlaskConical,
  Flag,
  Gauge,
  Inbox,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/site/shell";

export const metadata = { title: { default: "Admin", template: "%s · Admin · LOT3 Clips" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAdmin();
  const [pending, verify, flags] = await Promise.all([
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).or("verified_at.is.null,audience_status.eq.pending"),
    supabase.from("flags").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const groups = [
    {
      items: [{ href: "/admin", label: "Overview", icon: <Gauge />, exact: true }],
    },
    {
      title: "Operate",
      items: [
        { href: "/admin/review", label: "Review queue", short: "Review", icon: <Inbox />, badge: pending.count ?? 0 },
        { href: "/admin/verification", label: "Verification", short: "Verify", icon: <ShieldCheck />, badge: verify.count ?? 0 },
        { href: "/admin/flags", label: "Fraud flags", icon: <Flag />, badge: flags.count ?? 0 },
        { href: "/admin/payouts", label: "Payouts", icon: <Banknote /> },
      ],
    },
    {
      title: "Manage",
      items: [
        { href: "/admin/campaigns", label: "Campaigns", icon: <Megaphone /> },
        { href: "/admin/clippers", label: "Clippers", icon: <Users /> },
        { href: "/admin/clients", label: "Clients", icon: <Building2 /> },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/sync", label: "View sync", icon: <RefreshCw /> },
        { href: "/admin/activity", label: "Activity log", icon: <Activity /> },
        { href: "/admin/test-lab", label: "Test Lab", icon: <FlaskConical /> },
      ],
    },
  ];
  return (
    <Shell
      id="admin"
      mobileTabs={["/admin", "/admin/review", "/admin/verification", "/admin/campaigns"]}
      groups={groups}
      badge={<span className="rounded border border-line2 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-mute">Admin</span>}
      footer={
        <div className="flex items-center justify-between px-2 py-1 text-[12px]">
          <span className="text-mute">{profile.username}</span>
          <Link href="/dashboard" className="text-dim transition-colors hover:text-ink">Clipper view →</Link>
        </div>
      }
    >
      {children}
    </Shell>
  );
}
