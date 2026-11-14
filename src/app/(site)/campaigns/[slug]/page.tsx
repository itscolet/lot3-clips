import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { compact, money, money0, PLATFORM_LABEL, shortDate } from "@/lib/format";
import type { Campaign, SocialAccount, Stats, Submission } from "@/lib/types";
import { CampaignCover, PlatformRow } from "@/components/site/campaign-card";
import { ActivityTable, type ActivityRow } from "@/components/site/activity";
import { Tabs } from "@/components/ui/tabs";
import { Avatar, Card, LinkButton, Progress, StatusBadge, TestBadge } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { SubmitClipForm } from "./submit-form";

export async function generateMetadata({ params }: PageProps<"/campaigns/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

type Leader = { user_id: string; username: string; avatar_url: string | null; views: number; earned: number; posts: number };

export default async function CampaignPage({ params }: PageProps<"/campaigns/[slug]">) {
  const { slug } = await params;
  const { supabase, profile } = await getSession();
  const { data: c } = await supabase.from("campaigns").select("*").eq("slug", slug).maybeSingle<Campaign>();
  if (!c) notFound();

  const [{ data: st }, { data: lb }, { data: act }, mine] = await Promise.all([
    supabase.rpc("campaign_stats", { p_campaign: c.id }).single<Stats>(),
    supabase.rpc("leaderboard", { p_campaign: c.id, p_limit: 25 }),
    supabase.rpc("recent_activity", { p_campaign: c.id, p_limit: 8 }),
    profile
      ? Promise.all([
          supabase.from("social_accounts").select("*").eq("user_id", profile.id),
          supabase.from("submissions").select("*").eq("campaign_id", c.id).eq("user_id", profile.id).order("created_at", { ascending: false }),
        ])
      : null,
  ]);
  const stats: Stats = st ?? { submitted: 0, approved: 0, pending: 0, rejected: 0, total_views: 0, spent: 0, clippers: 0 };
  const leaders = (lb ?? []) as Leader[];
  const accounts = (mine?.[0].data ?? []) as SocialAccount[];
  const mySubs = (mine?.[1].data ?? []) as Submission[];
  const left = Math.max(0, Number(c.budget) - Number(stats.spent));

  const overview = (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <h3 className="text-[12px] font-medium uppercase tracking-[0.1em] text-dim">The brief</h3>
        <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{c.description || "Brief coming soon."}</div>
      </Card>
      <Card className="p-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            ["Submitted", stats.submitted],
            ["Approved", stats.approved],
            ["Pending", stats.pending],
            ["Denied", stats.rejected],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-line bg-s2 p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-dim">{l}</div>
              <div className="num mt-2 text-[24px] leading-none">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-end justify-between">
          <span className="text-[13px] text-mute">Spent {money(stats.spent)}</span>
          <span className="num text-[13px]">{money(left)} remaining</span>
        </div>
        <Progress value={Number(stats.spent)} max={Number(c.budget)} className="mt-3" />
      </Card>
      <Card className="px-6 py-3">
        <h3 className="pt-3 text-[12px] font-medium uppercase tracking-[0.1em] text-dim">Live submissions</h3>
        <ActivityTable rows={(act ?? []) as ActivityRow[]} showCampaign={false} />
      </Card>
    </div>
  );

  const rules = (
    <div className="flex flex-col gap-5">
      <RuleBlock title="Account requirements">
        <Rule k="Audience" v={c.territory === "US" ? "Majority US audience (screenshot approved)" : c.territory} />
        <Rule k="Platforms" v={c.platforms.map((p) => PLATFORM_LABEL[p]).join(", ")} />
        <Rule k="Minimum followers" v={c.min_followers ? c.min_followers.toLocaleString() : "None"} />
        <Rule k="Account age" v={c.min_account_age_months ? `${c.min_account_age_months}+ months` : "Any"} />
      </RuleBlock>
      <RuleBlock title="Content rules">
        {c.content_rules.length ? (
          c.content_rules.map((r, i) => (
            <div key={i} className="flex gap-3 py-2.5 text-[14px]">
              <span className="num w-5 text-dim">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-ink/90">{r}</span>
            </div>
          ))
        ) : (
          <p className="py-2 text-[14px] text-mute">Follow the brief and platform community guidelines.</p>
        )}
        {c.caption_requirements && <Rule k="Caption" v={c.caption_requirements} />}
        {c.max_payout_per_clip && <Rule k="Max payout per clip" v={money(c.max_payout_per_clip)} />}
      </RuleBlock>
      <RuleBlock title="Resources">
        {profile ? (
          <div className="flex flex-wrap gap-2 py-2">
            {c.sound_url && (
              <LinkButton href={c.sound_url} target="_blank" variant="secondary" size="sm">Open sound ↗</LinkButton>
            )}
            {c.assets_url && (
              <LinkButton href={c.assets_url} target="_blank" variant="secondary" size="sm">Footage & assets ↗</LinkButton>
            )}
            {!c.sound_url && !c.assets_url && <span className="text-[14px] text-mute">No extra resources.</span>}
          </div>
        ) : (
          <p className="py-2 text-[14px] text-mute">
            <Link href={`/login?next=/campaigns/${c.slug}`} className="text-ink underline underline-offset-4">Log in</Link> to unlock the sound and footage.
          </p>
        )}
      </RuleBlock>
      <RuleBlock title="Always">
        {[
          "Post from your own account. Keep the clip live for at least 30 days.",
          "No bots, view farms, or paid engagement. Botted views are never paid and the account is banned.",
          "One link per post. Reposting the same clip to farm views will be rejected.",
          "Follow the platform's community guidelines and add disclosures when the brief asks.",
        ].map((r, i) => (
          <div key={i} className="py-2 text-[14px] text-ink/90">{r}</div>
        ))}
      </RuleBlock>
    </div>
  );

  const board = (
    <Card className="p-6">
      {leaders.length ? (
        <>
          <div className="grid grid-cols-3 items-end gap-3">
            {[1, 0, 2].map((i) =>
              leaders[i] ? (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-2 rounded-2xl border border-line bg-s2 p-5 text-center ${i === 0 ? "pb-8 pt-7" : ""}`}
                >
                  <span className={`num grid size-9 place-items-center rounded-full ${i === 0 ? "bg-ink text-black" : "border border-line2 text-mute"} text-[14px]`}>
                    {i + 1}
                  </span>
                  <span className="mt-1 text-[14px] font-medium">{leaders[i].username}</span>
                  <span className="num text-[12px] text-mute">{compact(leaders[i].views)} views</span>
                  <span className="num text-[13px]">{money(leaders[i].earned)}</span>
                </div>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
          <table className="mt-6 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-dim">
                <th className="py-2 font-medium">#</th>
                <th className="font-medium">Clipper</th>
                <th className="text-right font-medium">Posts</th>
                <th className="text-right font-medium">Views</th>
                <th className="text-right font-medium">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leaders.map((l, i) => (
                <tr key={l.user_id}>
                  <td className="num py-3 text-dim">{i + 1}</td>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={l.username} src={l.avatar_url} size={24} />
                      {l.username}
                    </span>
                  </td>
                  <td className="num text-right text-mute">{l.posts}</td>
                  <td className="num text-right">{compact(l.views)}</td>
                  <td className="num text-right">{money(l.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="py-10 text-center text-[14px] text-mute">No approved clips yet. First in gets the top spot.</p>
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-10">
      <nav className="mb-6 flex items-center gap-2 text-[12px] text-dim">
        <Link href="/campaigns" className="hover:text-ink">Your invitations</Link>
        <span>/</span>
        <span className="text-mute">{c.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h1 className="text-[40px] font-medium leading-none tracking-[-0.04em]">{c.title}</h1>
            <StatusBadge status={c.status} />
            {c.is_test && <TestBadge />}
          </div>
          <p className="mb-8 text-[13px] text-mute">
            {c.artist ? `${c.artist} · ` : ""}Launched {shortDate(c.starts_at ?? c.created_at)} · {c.label}
          </p>
          <Tabs
            id="campaign"
            tabs={[
              { key: "overview", label: "Overview", content: overview },
              { key: "rules", label: "Rules", content: rules },
              { key: "board", label: "Leaderboard", content: board },
            ]}
          />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <CampaignCover title={c.title} slug={c.slug} cover={c.cover_url} label={c.label} className="aspect-[4/3] rounded-2xl border border-line" big />
          <Card className="divide-y divide-line">
            <div className="flex items-center justify-between p-5">
              <span className="text-[13px] text-mute">Rate per 1K views</span>
              <span className="num text-[24px]">{money(c.cpm)}</span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-mute">Budget</span>
                <span className="num text-[15px]">{money0(c.budget)}</span>
              </div>
              <Progress value={Number(stats.spent)} max={Number(c.budget)} className="mt-3" />
              <div className="mt-2 flex justify-between text-[11px] text-dim">
                <span className="num">{money(stats.spent)} paid</span>
                <span className="num">{money(left)} left</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="p-5">
                <div className="text-[11px] uppercase tracking-[0.08em] text-dim">Views</div>
                <div className="num mt-1.5 text-[18px]">{compact(stats.total_views)}</div>
              </div>
              <div className="p-5">
                <div className="text-[11px] uppercase tracking-[0.08em] text-dim">Clippers</div>
                <div className="num mt-1.5 text-[18px]">{stats.clippers}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-[13px] text-mute">Platforms</span>
              <PlatformRow platforms={c.platforms} />
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-[13px] text-mute">Territory</span>
              <span className="text-[13px]">{c.territory === "US" ? "US only" : c.territory}</span>
            </div>
          </Card>

          <Card className="p-5">
            {c.status !== "live" ? (
              <p className="text-center text-[13px] text-mute">This campaign isn&apos;t taking submissions.</p>
            ) : !profile ? (
              <div className="flex flex-col gap-3">
                <LinkButton href={`/signup?next=/campaigns/${c.slug}`} size="lg">Join campaign</LinkButton>
                <p className="text-center text-[12px] text-dim">Free. Takes a minute.</p>
              </div>
            ) : (
              <SubmitClipForm campaignId={c.id} slug={c.slug} platforms={c.platforms} accounts={accounts} usOnly={c.territory === "US"} />
            )}
          </Card>

          {mySubs.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.1em] text-dim">Your clips</h3>
              <div className="flex flex-col divide-y divide-line">
                {mySubs.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5 text-[12px]">
                    <PlatformIcon platform={s.platform} />
                    <a href={s.url} target="_blank" className="min-w-0 flex-1 truncate text-mute hover:text-ink">{s.url.replace(/^https?:\/\//, "")}</a>
                    <span className="num">{compact(s.views)}</span>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function RuleBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-dim">{title}</h3>
      <div className="divide-y divide-line">{children}</div>
    </Card>
  );
}
function Rule({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6 py-2.5 text-[14px]">
      <span className="text-mute">{k}</span>
      <span className="text-right text-ink/90">{v}</span>
    </div>
  );
}
