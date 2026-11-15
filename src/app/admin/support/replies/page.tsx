import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHead } from "@/components/site/shell";
import { ReplyEditor } from "./editor";

export const metadata = { title: "Saved replies" };

export default async function SavedRepliesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("support_saved_replies").select("id,title,body,body_es,sort").order("sort").order("title");
  const rows = data ?? [];
  return (
    <div className="max-w-[860px]">
      <Link href="/admin/support" className="text-[12px] text-mute hover:text-ink">← Support inbox</Link>
      <div className="mt-4">
        <PageHead
          title="Saved replies"
          sub="Reusable answers. When a clipper uses Spanish, the Spanish version is inserted automatically."
        />
      </div>
      <div className="flex flex-col gap-3">
        <ReplyEditor />
        {rows.map((r) => (
          <ReplyEditor key={r.id} reply={r} />
        ))}
      </div>
    </div>
  );
}
