import { requireAdmin } from "@/lib/auth";
import { PageHead } from "@/components/site/shell";
import { CampaignForm } from "@/components/admin/campaign-form";

export const metadata = { title: "New campaign" };

export default async function NewCampaign() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("clients").select("id,name").order("name");
  return (
    <>
      <PageHead title="New campaign" sub="Save as draft, then publish when it's ready." />
      <CampaignForm clients={data ?? []} />
    </>
  );
}
