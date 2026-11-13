import type { Platform } from "./types";

const TOKEN = () => process.env.APIFY_TOKEN;
const TIKTOK_ACTOR = process.env.APIFY_TIKTOK_ACTOR ?? "clockworks~tiktok-scraper";
const IG_POST_ACTOR = process.env.APIFY_INSTAGRAM_ACTOR ?? "apify~instagram-scraper";
const IG_PROFILE_ACTOR = process.env.APIFY_INSTAGRAM_PROFILE_ACTOR ?? "apify~instagram-profile-scraper";

export const apifyConfigured = () => Boolean(TOKEN());

export type Metrics = { views: number; likes: number; comments: number; shares: number };

async function runActor<T = Record<string, unknown>>(actor: string, input: unknown, timeoutSec = 240): Promise<T[]> {
  const token = TOKEN();
  if (!token) throw new Error("APIFY_TOKEN is not set");
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=${timeoutSec}&clean=true`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Apify ${actor} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T[];
}

export const tiktokId = (url: string) => url.match(/\/video\/(\d+)/)?.[1] ?? null;
export const igCode = (url: string) => url.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;

const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);

/** Fetch current metrics for a batch of post URLs on one platform. Returns a map url -> metrics (missing = not found). */
export async function fetchMetrics(platform: Platform, urls: string[]): Promise<Map<string, Metrics>> {
  const out = new Map<string, Metrics>();
  if (!urls.length) return out;

  if (platform === "tiktok") {
    const items = await runActor<Record<string, unknown>>(TIKTOK_ACTOR, {
      postURLs: urls,
      resultsPerPage: 1,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    });
    const byId = new Map<string, Record<string, unknown>>();
    for (const it of items) {
      const id = String(it.id ?? tiktokId(String(it.webVideoUrl ?? "")) ?? "");
      if (id) byId.set(id, it);
      const sub = String(it.submittedVideoUrl ?? it.inputUrl ?? "");
      if (sub) byId.set(sub, it);
    }
    for (const u of urls) {
      const it = byId.get(tiktokId(u) ?? "") ?? byId.get(u) ?? (urls.length === 1 && items.length === 1 ? items[0] : undefined);
      if (it && !it.error)
        out.set(u, { views: n(it.playCount), likes: n(it.diggCount), comments: n(it.commentCount), shares: n(it.shareCount) });
    }
    return out;
  }

  if (platform === "instagram") {
    const items = await runActor<Record<string, unknown>>(IG_POST_ACTOR, {
      directUrls: urls,
      resultsType: "posts",
      resultsLimit: 1,
      addParentData: false,
    });
    const byCode = new Map<string, Record<string, unknown>>();
    for (const it of items) {
      const code = String(it.shortCode ?? igCode(String(it.url ?? "")) ?? "");
      if (code) byCode.set(code, it);
    }
    for (const u of urls) {
      const it = byCode.get(igCode(u) ?? "");
      if (it && !it.error)
        out.set(u, {
          views: n(it.videoPlayCount ?? it.videoViewCount ?? it.igPlayCount),
          likes: Math.max(0, n(it.likesCount)),
          comments: n(it.commentsCount),
          shares: n(it.sharesCount),
        });
    }
    return out;
  }

  // YouTube / X: not auto-tracked yet (manual entry in admin)
  return out;
}

/** Check a profile's bio for the verification code. */
export async function checkBioCode(
  platform: Platform,
  handle: string,
  code: string,
): Promise<{ status: "found" | "not_found" | "unavailable"; followers?: number }> {
  if (!apifyConfigured() || (platform !== "tiktok" && platform !== "instagram")) return { status: "unavailable" };
  try {
    if (platform === "tiktok") {
      const items = await runActor<Record<string, unknown>>(
        TIKTOK_ACTOR,
        { profiles: [handle], resultsPerPage: 1, profileScrapeSections: ["videos"], shouldDownloadVideos: false, shouldDownloadCovers: false },
        120,
      );
      const meta = (items[0]?.authorMeta ?? {}) as Record<string, unknown>;
      const bio = String(meta.signature ?? "");
      return { status: bio.toUpperCase().includes(code.toUpperCase()) ? "found" : "not_found", followers: n(meta.fans) || undefined };
    }
    const items = await runActor<Record<string, unknown>>(IG_PROFILE_ACTOR, { usernames: [handle] }, 120);
    const it = items[0] ?? {};
    const bio = String(it.biography ?? "");
    return { status: bio.toUpperCase().includes(code.toUpperCase()) ? "found" : "not_found", followers: n(it.followersCount) || undefined };
  } catch {
    return { status: "unavailable" };
  }
}
