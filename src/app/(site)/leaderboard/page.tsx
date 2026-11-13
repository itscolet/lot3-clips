import type { Metadata } from "next";
import { supabasePublic } from "@/lib/supabase/server";
import { compact, money } from "@/lib/format";
import { Avatar, Card } from "@/components/ui/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";

export const metadata: Metadata = { title: "Leaderboard" };

type Leader = { user_id: string; username: string; avatar_url: string | null; views: number; earned: number; posts: number };

export default async function LeaderboardPage() {
  const { data } = await supabasePublic().rpc("leaderboard", { p_limit: 100 });
  const rows = (data ?? []) as Leader[];
  const podium = [rows[1], rows[0], rows[2]];
  return (
    <div className="mx-auto max-w-[1000px] px-5 pt-16">
      <Reveal>
        <h1 className="text-center text-[44px] font-medium tracking-[-0.04em]">Leaderboard</h1>
        <p className="mt-2 text-center text-[14px] text-mute">Top clippers by verified views, all campaigns.</p>
      </Reveal>
      {rows.length ? (
        <>
          <Stagger className="mt-14 grid grid-cols-3 items-end gap-4">
            {podium.map((l, i) =>
              l ? (
                <StaggerItem key={l.user_id}>
                  <div
                    className={`grain flex flex-col items-center gap-3 rounded-3xl border border-line bg-gradient-to-b from-[#161616] to-black px-4 text-center ${
                      i === 1 ? "py-12" : "py-8"
                    }`}
                  >
                    <span className={`num grid size-10 place-items-center rounded-full text-[15px] ${i === 1 ? "bg-ink text-black" : "border border-line2 text-mute"}`}>
                      {i === 1 ? 1 : i === 0 ? 2 : 3}
                    </span>
                    <Avatar name={l.username} src={l.avatar_url} size={i === 1 ? 64 : 52} />
                    <span className="text-[15px] font-medium">{l.username}</span>
                    <div className="grid w-full grid-cols-2 gap-2 text-[11px] text-dim">
                      <div>
                        <div className="num text-[16px] text-ink">{compact(l.views)}</div>views
                      </div>
                      <div>
                        <div className="num text-[16px] text-ink">{money(l.earned, 0)}</div>earned
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ) : (
                <div key={i} />
              ),
            )}
          </Stagger>
          <Reveal delay={0.1}>
            <Card className="mt-10 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="border-b border-line bg-s2 text-left text-[11px] uppercase tracking-[0.08em] text-dim">
                  <tr>
                    <th className="px-5 py-3 font-medium">Rank</th>
                    <th className="font-medium">Clipper</th>
                    <th className="text-right font-medium">Posts</th>
                    <th className="text-right font-medium">Views</th>
                    <th className="px-5 text-right font-medium">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.slice(3).map((l, i) => (
                    <tr key={l.user_id} className="transition-colors hover:bg-s2">
                      <td className="num px-5 py-3.5 text-dim">{i + 4}</td>
                      <td>
                        <span className="flex items-center gap-3">
                          <Avatar name={l.username} src={l.avatar_url} size={26} />
                          {l.username}
                        </span>
                      </td>
                      <td className="num text-right text-mute">{l.posts}</td>
                      <td className="num text-right">{compact(l.views)}</td>
                      <td className="num px-5 text-right">{money(l.earned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length <= 3 && <p className="py-8 text-center text-[13px] text-dim">More spots open.</p>}
            </Card>
          </Reveal>
        </>
      ) : (
        <Card className="mt-14 px-6 py-20 text-center text-[14px] text-mute">The board fills up as clips get approved.</Card>
      )}
    </div>
  );
}
