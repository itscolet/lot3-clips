# LOT3 Clips

Pay-per-view clipping marketplace by LOT3 Media. Next.js 16 + Supabase + Apify, hosted on Railway.

## Environment variables

| Name | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nhhdbpmidkqdkeatowif.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the site, no trailing slash |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys → service_role / secret. Needed for the scheduled view sync and automatic bio verification. |
| `APIFY_TOKEN` | Apify → Settings → Integrations → API token. Needed for live view tracking. |
| `CRON_SECRET` | Random string; the cron job sends it as `Authorization: Bearer <secret>` to `POST /api/cron/sync`. |

## Scheduled view sync

A Railway cron service runs every 6 hours:

```
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "$SITE_URL/api/cron/sync"
```

## Admin

Make an account admin in Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where username = 'yourname';
```

Then open `/admin`. The Test Lab (`/admin/test-lab`) runs every function end to end with throwaway TEST data.

## Earnings

`earnings = views / 1000 × CPM`, capped per clip if set; if approved views exceed the budget, earnings are prorated so spend never exceeds budget. Earnings become payable when a campaign is marked complete.

## Support inbox

Clippers and visitors message support from `/support`, the floating **Help** button on public pages, or **Dashboard → Support**. Signed-in clippers can attach screenshots. Visitors without an account get a private link (`/support/t/<token>`) to follow the conversation.

Admins work the inbox at `/admin/support`:

- **Needs reply / Waiting / Mine / Unassigned / Resolved** tabs, search (subject, message, name, email, `@user`, `#1001`), topic / priority / tag filters.
- Reply or leave an **internal note** (never shown to the clipper). **Send & resolve** in one step. Replying claims an unassigned ticket.
- **Saved replies** (`/admin/support/replies`) with optional Spanish versions, inserted automatically for Spanish-speaking clippers. **Translate ↗** links on every incoming message and on Spanish drafts.
- Shortcuts: `J`/`K` move, `R` reply, `N` note, `E` resolve, `⌘↵` send.
- Visitors aren't emailed automatically: use **Email visitor their link** on their ticket.

Schema: `supabase/migrations/20261115010000_support_inbox.sql` (tables, row-level security, rate-limited `support_*` functions, private `support` storage bucket, starter saved replies). Run it once in the Supabase SQL editor. The Test Lab's **Support inbox** test checks the whole flow.

## Page claims

Clippers sign up without email confirmation and claim TikTok, Instagram or YouTube pages by typing the username (or pasting the profile link) under **Dashboard → Your pages**. A claim is active immediately; there's no bio code.

If someone tries to claim a page another account already holds, the claim is blocked and a **high-priority ticket** opens in `/admin/support` (tag `claim-conflict`). It shows who's trying, the current owner (email, when they claimed it, clips and earnings on that page, other pages), a risk read, and **Transfer** / **Keep** buttons that move the page (or not), message the claimant in their language, and resolve the ticket. Repeat attempts bump the same ticket to urgent instead of opening new ones.

Schema: `supabase/migrations/20261116040000_page_claims.sql`. Test Lab: **Page claims** test.

## Email + SMS notifications

**Signup** shows the full Terms & rules in a scroll box; "I accept" unlocks once the clipper reaches the end. They can opt in to **new-campaign emails** (on by default) and **texts** (off by default; needs a mobile number with country code + explicit consent). Accepted terms version and time are stored. Clippers change opt-ins in **Settings → Notifications**; every campaign email has a one-click unsubscribe.

**What gets sent**

| When | Who | Channel |
|---|---|---|
| You press **Announce** on a live campaign (`/admin/campaigns/<id>`) | Opted-in clippers, in their language | Email + text |
| You reply to a support ticket (or resolve a claim) | That clipper, or the visitor who wrote in | Email |
| New support ticket | You | Email + text |
| Page claim blocked | You | Email + text |

"Send test to me" on a campaign and the test buttons on `/admin/messages` send only to your alert contacts. Every message is logged on `/admin/messages`.

**Environment variables (Railway)**

| Variable | What |
|---|---|
| `RESEND_API_KEY` | Resend API key (email) |
| `EMAIL_FROM` | e.g. `LOT3 Clips <campaigns@lot3clips.com>` (domain verified in Resend) |
| `EMAIL_POSTAL_ADDRESS` | Mailing address shown in campaign email footers (required by CAN-SPAM) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio credentials (texts) |
| `TWILIO_FROM` | Twilio number (`+1…`) or Messaging Service SID (`MG…`) |
| `ADMIN_ALERT_EMAIL` | Where your alerts go (default `admin@lot3media.com`) |
| `ADMIN_ALERT_PHONE` | Your mobile for alert texts (`+1…`) |

Without keys nothing breaks: messages are logged as "skipped". Texts to someone who replied STOP automatically turn their texts off.

Schema: `supabase/migrations/20261116060000_notifications.sql` (private `notification_prefs`, `notifications` log, unsubscribe + recipient functions).
