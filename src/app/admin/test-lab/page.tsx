import { requireAdmin } from "@/lib/auth";
import { TESTS, type SuiteReport } from "@/lib/testlab";
import { PageHead } from "@/components/site/shell";
import { Lab } from "./lab";

export const metadata = { title: "Test Lab" };
export const maxDuration = 300;

export default async function TestLabPage() {
  const { supabase } = await requireAdmin();
  const [{ data: runs }, testCounts] = await Promise.all([
    supabase.from("test_runs").select("id,passed,failed,results,created_at").order("id", { ascending: false }).limit(10),
    Promise.all([
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("is_test", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_test", true),
    ]),
  ]);
  const last = runs?.[0]
    ? ({ passed: runs[0].passed, failed: runs[0].failed, warned: 0, results: runs[0].results, ranAt: runs[0].created_at } as SuiteReport)
    : null;
  return (
    <>
      <PageHead
        title="Test Lab"
        sub="Runs every function end to end against the real database using throwaway TEST data, then cleans up."
      />
      <Lab
        tests={TESTS.map(({ key, name, area }) => ({ key, name, area }))}
        last={last}
        history={(runs ?? []).map((r) => ({ id: r.id, passed: r.passed, failed: r.failed, at: r.created_at }))}
        testData={{ campaigns: testCounts[0].count ?? 0, clippers: testCounts[1].count ?? 0 }}
      />
    </>
  );
}
