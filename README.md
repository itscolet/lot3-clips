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
