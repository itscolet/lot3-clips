export type Platform = "tiktok" | "instagram" | "youtube" | "x";
export type CampaignStatus = "draft" | "live" | "paused" | "complete";
export type SubmissionStatus = "pending" | "approved" | "rejected" | "removed";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "clipper" | "admin";
  status: "active" | "banned";
  trust: "normal" | "trusted" | "watch";
  country: string | null;
  is_test: boolean;
  created_at: string;
};

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  client_id: string | null;
  label: string;
  description: string;
  content_rules: string[];
  caption_requirements: string | null;
  sound_url: string | null;
  assets_url: string | null;
  cover_url: string | null;
  cpm: number;
  budget: number;
  max_payout_per_clip: number | null;
  platforms: Platform[];
  territory: string;
  min_followers: number;
  min_account_age_months: number;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  report_token: string;
  is_test: boolean;
  created_at: string;
};

export type CampaignCard = {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  label: string;
  cover_url: string | null;
  cpm: number;
  budget: number;
  platforms: Platform[];
  status: CampaignStatus;
  territory: string;
  created_at: string;
  spent: number;
  total_views: number;
  approved: number;
  is_test: boolean;
};

export type SocialAccount = {
  id: string;
  user_id: string;
  platform: Platform;
  handle: string;
  followers: number | null;
  verify_code: string;
  verified_at: string | null;
  audience_screenshot_path: string | null;
  audience_status: "none" | "pending" | "approved" | "rejected";
  us_audience_pct: number | null;
  is_test: boolean;
  created_at: string;
};

export type Submission = {
  id: string;
  campaign_id: string;
  user_id: string;
  social_account_id: string | null;
  platform: Platform;
  url: string;
  status: SubmissionStatus;
  reject_reason: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  earnings: number;
  last_synced_at: string | null;
  reviewed_at: string | null;
  is_test: boolean;
  created_at: string;
};

export type Stats = {
  submitted: number;
  approved: number;
  pending: number;
  rejected: number;
  total_views: number;
  spent: number;
  clippers: number;
};
