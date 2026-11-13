import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { PageHead } from "@/components/site/shell";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/admin/table";
import { Empty } from "@/components/ui/ui";

export const metadata = { title: "Activity log" };

export default async function ActivityPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: admins }] = await Promise.all([
    supabase.from("activity_log").select("*").order("id", { ascending: false }).limit(300),
    supabase.from("profiles").select("id,username").eq("role", "admin"),
  ]);
  const name = new Map((admins ?? []).map((a) => [a.id, a.username]));
  return (
    <>
      <PageHead title="Activity log" sub="Every admin action, newest first." />
      {(data ?? []).length ? (
        <Table>
          <THead>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>Action</Th>
            <Th>Details</Th>
          </THead>
          <TBody>
            {(data ?? []).map((l) => (
              <Tr key={l.id}>
                <Td className="whitespace-nowrap text-[12px] text-dim">{timeAgo(l.created_at)}</Td>
                <Td className="text-mute">{name.get(l.actor_id) ?? "system"}</Td>
                <Td className="font-mono text-[12px]">{l.action}</Td>
                <Td className="max-w-[460px] truncate font-mono text-[11px] text-dim" title={JSON.stringify(l.meta)}>{JSON.stringify(l.meta)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : (
        <Empty title="No activity yet" />
      )}
    </>
  );
}
