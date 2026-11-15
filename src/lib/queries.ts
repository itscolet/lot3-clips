// Shared select strings for admin screens. The Test Lab runs each one so a broken join fails a test, not a page.
export const Q = {
  reviewQueue:
    "id,url,platform,status,views,likes,reject_reason,created_at,is_test,campaign_id,campaigns(id,title,slug,platforms,territory,content_rules,sound_url),profiles!submissions_user_id_fkey(id,username,trust,status,created_at),social_accounts(handle,followers,verified_at,audience_status,us_audience_pct)",
  campaignClips:
    "id,url,platform,status,views,likes,earnings,reject_reason,last_synced_at,created_at,is_test,profiles!submissions_user_id_fkey(id,username),social_accounts(handle,followers)",
  clippers:
    "id,username,role,status,trust,is_test,created_at,social_accounts(platform,verified_at,audience_status),submissions!submissions_user_id_fkey(status,views,earnings)",
  clipperClips: "id,url,platform,status,views,earnings,created_at,campaigns(id,title)",
  flags:
    "id,type,detail,status,created_at,is_test,submissions(id,url,platform,views,likes,status,campaigns(id,title)),profiles(id,username,trust)",
  payoutHistory:
    "id,amount,method,reference,status,created_at,is_test,profiles!payouts_user_id_fkey(id,username),campaigns(title)",
  verification: "*, profiles(id,username)",
  clients: "id,name,contact,notes,is_test,campaigns(id,title,status,budget,report_token)",
  campaignsWithClient: "*, clients(name)",
  myClips: "id,url,platform,status,views,earnings,reject_reason,created_at,campaigns(title,slug,cpm,status)",
  supportInbox:
    "id,number,subject,status,priority,category,tags,lang,preview,last_message_at,last_message_from,unread_admin,message_count,guest_name,guest_email,is_test,created_at,assigned_to,user_id,profiles!support_tickets_user_id_fkey(id,username)",
} as const;

export const ADMIN_QUERY_TABLES: Record<keyof typeof Q, string> = {
  reviewQueue: "submissions",
  campaignClips: "submissions",
  clippers: "profiles",
  clipperClips: "submissions",
  flags: "flags",
  payoutHistory: "payouts",
  verification: "social_accounts",
  clients: "clients",
  campaignsWithClient: "campaigns",
  myClips: "submissions",
  supportInbox: "support_tickets",
};
