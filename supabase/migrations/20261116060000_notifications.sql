-- LOT3 Clips — Notifications (email + SMS) and terms acceptance
-- Contact preferences live in their own private table: profiles is publicly readable (leaderboards),
-- so phone numbers and opt-ins must never go there.

create table public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_opt_in boolean not null default false,
  sms_opt_in boolean not null default false,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  lang text not null default 'en' check (lang in ('en','es')),
  terms_version text,
  terms_accepted_at timestamptz,
  unsub_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  updated_at timestamptz not null default now(),
  check (not sms_opt_in or phone is not null)
);
alter table public.notification_prefs enable row level security;
create policy "prefs admin" on public.notification_prefs for all using (public.is_admin()) with check (public.is_admin());
create policy "prefs self read" on public.notification_prefs for select using (user_id = auth.uid());
create policy "prefs self update" on public.notification_prefs for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- clippers can change their own opt-ins / phone / language, never the terms record or token
create or replace function public.guard_prefs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.user_id := old.user_id; new.terms_version := old.terms_version;
    new.terms_accepted_at := old.terms_accepted_at; new.unsub_token := old.unsub_token;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_prefs before update on public.notification_prefs for each row execute function public.guard_prefs();

-- Delivery log (admin only)
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('email','sms')),
  kind text not null,
  recipient text not null,
  subject text,
  status text not null check (status in ('sent','failed','skipped')),
  error text,
  provider_id text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ticket_id uuid references public.support_tickets(id) on delete set null,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_created_idx on public.notifications (created_at desc);
alter table public.notifications enable row level security;
create policy "notifications admin" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

alter table public.campaigns add column if not exists announced_at timestamptz;

-- New signups: create prefs from what they chose on the signup form (stored in user metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0; m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_phone text;
begin
  base := lower(regexp_replace(coalesce(m->>'username', split_part(new.email,'@',1)), '[^a-z0-9_.]', '', 'gi'));
  if length(base) < 3 then base := base || 'clip'; end if;
  base := substr(base,1,20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1; candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(m->>'username', candidate));

  v_phone := nullif(m->>'phone', '');
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then v_phone := null; end if;
  insert into public.notification_prefs (user_id, email_opt_in, sms_opt_in, phone, lang, terms_version, terms_accepted_at)
  values (
    new.id,
    coalesce((m->>'email_opt_in')::boolean, false),
    coalesce((m->>'sms_opt_in')::boolean, false) and v_phone is not null,
    v_phone,
    case when m->>'lang' = 'es' then 'es' else 'en' end,
    nullif(m->>'terms_version', ''),
    case when nullif(m->>'terms_version', '') is not null then now() end
  );
  return new;
end $$;

-- Existing accounts get a prefs row (no opt-ins assumed).
insert into public.notification_prefs (user_id)
select p.id from public.profiles p join auth.users u on u.id = p.id
on conflict (user_id) do nothing;

-- One-click unsubscribe from campaign emails (link in every campaign email).
create or replace function public.unsubscribe_email(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_token is null or char_length(p_token) < 24 then return false; end if;
  update public.notification_prefs set email_opt_in = false where unsub_token = p_token returning user_id into v_id;
  return v_id is not null;
end $$;

-- Admin-only: everyone who can receive a campaign announcement, with contact details.
create or replace function public.notification_recipients()
returns table (user_id uuid, username text, email text, phone text, lang text, email_opt_in boolean, sms_opt_in boolean, unsub_token text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, p.username, u.email::text, n.phone, n.lang, n.email_opt_in, n.sms_opt_in, n.unsub_token
  from public.profiles p
  join public.notification_prefs n on n.user_id = p.id
  join auth.users u on u.id = p.id
  where public.is_admin() and p.role = 'clipper' and p.status <> 'banned' and not p.is_test
    and (n.email_opt_in or n.sms_opt_in);
$$;

-- Admin-only: one person's contact details (support replies, alerts).
create or replace function public.user_contact(p_user uuid)
returns table (email text, phone text, lang text, sms_opt_in boolean, unsub_token text)
language sql stable security definer set search_path = public, auth as $$
  select u.email::text, n.phone, coalesce(n.lang, 'en'), coalesce(n.sms_opt_in, false), n.unsub_token
  from auth.users u left join public.notification_prefs n on n.user_id = u.id
  where u.id = p_user and public.is_admin();
$$;

-- Turn off texts for a number that replied STOP (called with the service key when the SMS provider reports an opt-out).
create or replace function public.sms_opt_out(p_phone text)
returns void language sql security definer set search_path = public as $$
  update public.notification_prefs set sms_opt_in = false where phone = p_phone and public.is_admin();
$$;

revoke all on function public.unsubscribe_email(text) from public;
revoke all on function public.notification_recipients() from public, anon;
revoke all on function public.user_contact(uuid) from public, anon;
revoke all on function public.sms_opt_out(text) from public, anon;
revoke all on function public.guard_prefs() from public, anon, authenticated;
grant execute on function public.unsubscribe_email(text) to anon, authenticated;
grant execute on function public.notification_recipients() to authenticated;
grant execute on function public.user_contact(uuid) to authenticated;
grant execute on function public.sms_opt_out(text) to authenticated;
