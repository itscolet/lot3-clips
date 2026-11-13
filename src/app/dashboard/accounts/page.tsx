import { requireUser } from "@/lib/auth";
import type { SocialAccount } from "@/lib/types";
import { PageHead } from "@/components/site/shell";
import { Card, Empty } from "@/components/ui/ui";
import { ConnectForm, AccountCard } from "./forms";

export default async function AccountsPage() {
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.from("social_accounts").select("*").eq("user_id", profile.id).order("created_at");
  const accounts = (data ?? []) as SocialAccount[];
  return (
    <>
      <PageHead title="Connected accounts" sub="Verify each page you post from. We never ask for passwords." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {accounts.length ? (
            accounts.map((a) => <AccountCard key={a.id} a={a} />)
          ) : (
            <Empty title="No accounts yet" body="Add the TikTok or Instagram page you'll post clips from." />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-4 text-[14px] font-medium">Add an account</h3>
            <ConnectForm />
          </Card>
          <Card className="p-5 text-[13px] leading-relaxed text-mute">
            <h3 className="mb-3 text-[14px] font-medium text-ink">How verification works</h3>
            <ol className="flex flex-col gap-2.5">
              <li><span className="num mr-2 text-dim">01</span>Add your handle.</li>
              <li><span className="num mr-2 text-dim">02</span>Paste your code anywhere in that account&apos;s bio.</li>
              <li><span className="num mr-2 text-dim">03</span>Hit Verify. Then you can remove the code.</li>
              <li><span className="num mr-2 text-dim">04</span>For US-only campaigns, upload a screenshot of your audience locations (TikTok: Analytics → Followers. Instagram: Insights → Total followers).</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
