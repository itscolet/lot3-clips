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
