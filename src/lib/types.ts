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

export type SupportCategory = "payouts" | "campaign" | "verification" | "account" | "bug" | "brand" | "other";
export type SupportStatus = "open" | "waiting" | "resolved";
export type SupportPriority = "low" | "normal" | "high" | "urgent";

export type SupportTicket = {
  id: string;
  number: number;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  access_token: string;
  subject: string;
  category: SupportCategory;
  campaign_id: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  assigned_to: string | null;
  tags: string[];
  lang: "en" | "es";
  message_count: number;
  last_message_at: string;
  last_message_from: string | null;
  preview: string | null;
  meta: Record<string, unknown>;
  unread_admin: boolean;
  unread_user: boolean;
  first_response_at: string | null;
  resolved_at: string | null;
  is_test: boolean;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_role: "clipper" | "guest" | "admin" | "system";
  body: string;
  internal: boolean;
  attachment_path: string | null;
  created_at: string;
  /** signed URL, added server-side when there is an attachment */
  attachment_url?: string | null;
};
