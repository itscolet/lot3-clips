import { requireUser } from "@/lib/auth";
import type { SocialAccount } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { Card, Empty } from "@/components/ui/ui";
import { ConnectForm, AccountCard } from "./forms";
import { getT } from "@/lib/i18n/server";

export default async function AccountsPage() {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const A = t.accounts;
  const { data } = await supabase.from("social_accounts").select("*").eq("user_id", profile.id).order("created_at");
  const accounts = (data ?? []) as SocialAccount[];
  return (
    <>
      <PageHead title={A.title} sub={A.sub} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {accounts.length ? (
            accounts.map((a) => <AccountCard key={a.id} a={a} />)
          ) : (
            <Empty title={A.emptyTitle} body={A.emptySub} />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-4 text-[14px] font-medium">{A.add}</h3>
            <ConnectForm />
          </Card>
          <Card className="p-5 text-[13px] leading-relaxed text-mute">
            <h3 className="mb-3 text-[14px] font-medium text-ink">{A.howTitle}</h3>
            <ol className="flex flex-col gap-2.5">
              {A.how.map((step, i) => (
                <li key={i}><span className="num mr-2 text-dim">{String(i + 1).padStart(2, "0")}</span>{step}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
