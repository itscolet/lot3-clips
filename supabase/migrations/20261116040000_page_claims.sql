-- LOT3 Clips — Page claims
-- Clippers claim TikTok / Instagram / YouTube pages by username. No bio code: a claim is active immediately.
-- Claiming a page someone else already holds is blocked and opens a high-priority ticket for admins
-- with everything needed to decide (owner vs claimant, activity on the page, risk read).

-- 1) Claims are active on insert (admins can still revoke by clearing verified_at).
create or replace function public.guard_social()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verified_at := now();
      new.audience_status := case when new.audience_screenshot_path is null then 'none' else 'pending' end;
      new.us_audience_pct := null; new.is_test := false;
    else
      new.verified_at := old.verified_at; new.us_audience_pct := old.us_audience_pct; new.is_test := old.is_test;
      new.verify_code := old.verify_code; new.platform := old.platform; new.handle := old.handle;
      if new.audience_screenshot_path is distinct from old.audience_screenshot_path and new.audience_screenshot_path is not null then
        new.audience_status := 'pending';
      else
        new.audience_status := old.audience_status;
      end if;
    end if;
  end if;
  return new;
end $$;

-- 2) Clippers can remove a page they claimed, as long as no clips were submitted from it.
drop policy if exists "social self delete" on public.social_accounts;
create policy "social self delete" on public.social_accounts for delete using (
  user_id = auth.uid() and not exists (select 1 from public.submissions s where s.social_account_id = social_accounts.id)
);

-- 3) Structured context on tickets (used by claim conflicts).
alter table public.support_tickets add column if not exists meta jsonb not null default '{}'::jsonb;
create index if not exists support_tickets_meta_type_idx on public.support_tickets ((meta->>'type'));

-- 4) Activate any existing pending pages.
update public.social_accounts set verified_at = now() where verified_at is null;

-- 5) Claim a page.
create or replace function public.claim_page(p_platform text, p_handle text, p_lang text default 'en')
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_h text; v_acc public.social_accounts; v_me public.profiles; v_owner public.profiles;
  v_label text; v_url text; v_tid uuid; v_num bigint; v_attempts int;
  v_subs int; v_appr int; v_earn numeric; v_owner_email text; v_me_email text;
  v_owner_pages text; v_my_pages text; v_prior int; v_risk text; v_meta jsonb; v_es boolean;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_platform is null or p_platform not in ('tiktok','instagram','youtube') then return jsonb_build_object('status','invalid'); end if;
  v_es := coalesce(p_lang, 'en') = 'es';

  v_h := lower(btrim(coalesce(p_handle, '')));
  v_h := regexp_replace(v_h, '^https?://', '');
  v_h := regexp_replace(v_h, '^(www\.|m\.)?(tiktok\.com|instagram\.com|youtube\.com)/', '');
  v_h := regexp_replace(v_h, '^@', '');
  v_h := regexp_replace(v_h, '[/?#].*$', '');
  if v_h !~ '^[a-z0-9._-]{2,60}$' then return jsonb_build_object('status','invalid'); end if;

  select * into v_me from public.profiles where id = v_uid;
  if v_me.id is null or v_me.status = 'banned' then raise exception 'suspended'; end if;

  select * into v_acc from public.social_accounts a where a.platform = p_platform and a.handle = v_h;

  if v_acc.id is null then
    begin
      insert into public.social_accounts (user_id, platform, handle, verified_at)
      values (v_uid, p_platform, v_h, now()) returning * into v_acc;
      return jsonb_build_object('status','claimed','id',v_acc.id,'handle',v_h);
    exception when unique_violation then
      select * into v_acc from public.social_accounts a where a.platform = p_platform and a.handle = v_h;
    end;
  end if;

  if v_acc.user_id = v_uid then return jsonb_build_object('status','yours','handle',v_h); end if;

  -- ---------- conflict ----------
  v_label := case p_platform when 'tiktok' then 'TikTok' when 'instagram' then 'Instagram' else 'YouTube' end;
  v_url := case p_platform
    when 'tiktok' then 'https://www.tiktok.com/@' || v_h
    when 'instagram' then 'https://www.instagram.com/' || v_h || '/'
    else 'https://www.youtube.com/@' || v_h end;

  -- same person retrying the same page: bump the existing open ticket instead of opening another
  select t.id, t.number into v_tid, v_num from public.support_tickets t
  where t.user_id = v_uid and t.meta->>'type' = 'claim_conflict' and t.meta->>'account_id' = v_acc.id::text and t.status <> 'resolved'
  order by t.created_at desc limit 1;
  if v_tid is not null then
    update public.support_tickets
      set meta = jsonb_set(meta, '{attempts}', to_jsonb(coalesce((meta->>'attempts')::int, 1) + 1)),
          priority = 'urgent', unread_admin = true
      where id = v_tid
      returning (meta->>'attempts')::int into v_attempts;
    insert into public.support_messages (ticket_id, author_role, body, internal)
    values (v_tid, 'system', format('Tried to claim @%s again (attempt %s). Priority raised to urgent.', v_h, v_attempts), true);
    return jsonb_build_object('status','taken','handle',v_h,'ticket',v_num);
  end if;

  select * into v_owner from public.profiles where id = v_acc.user_id;
  select count(*), count(*) filter (where s.status = 'approved'), coalesce(sum(s.earnings) filter (where s.status = 'approved'), 0)
    into v_subs, v_appr, v_earn
    from public.submissions s where s.social_account_id = v_acc.id;
  select u.email::text into v_owner_email from auth.users u where u.id = v_acc.user_id;
  select u.email::text into v_me_email from auth.users u where u.id = v_uid;
  select coalesce(string_agg(a.platform || ' @' || a.handle, ', ' order by a.created_at), 'none') into v_owner_pages
    from public.social_accounts a where a.user_id = v_acc.user_id and a.id <> v_acc.id;
  select coalesce(string_agg(a.platform || ' @' || a.handle, ', ' order by a.created_at), 'none') into v_my_pages
    from public.social_accounts a where a.user_id = v_uid;
  select count(*) into v_prior from public.support_tickets t where t.user_id = v_uid and t.meta->>'type' = 'claim_conflict';

  v_risk := case
    when v_prior >= 2 then 'HIGH: this clipper has tried to claim other people''s pages before. Treat as a possible impersonation.'
    when v_appr > 0 then 'CAREFUL: the current owner already has approved clips / earnings on this page. Get proof from both before moving it.'
    when v_subs > 0 then 'MEDIUM: the current owner has submitted clips from this page (none approved yet). Ask both for proof.'
    when v_acc.created_at > now() - interval '2 days' then 'LOW: the page was claimed recently and has no clips. If the claimant proves it''s theirs, transfer it.'
    else 'LOW: no clips on this page yet. If the claimant proves it''s theirs, transfer it.'
  end;

  v_meta := jsonb_build_object(
    'type', 'claim_conflict', 'attempts', 1,
    'platform', p_platform, 'handle', v_h, 'url', v_url, 'account_id', v_acc.id,
    'owner_id', v_acc.user_id, 'owner_username', v_owner.username, 'owner_email', v_owner_email,
    'owner_claimed_at', v_acc.created_at, 'owner_joined_at', v_owner.created_at,
    'owner_clips', v_subs, 'owner_approved', v_appr, 'owner_earned', v_earn, 'owner_other_pages', v_owner_pages,
    'claimant_id', v_uid, 'claimant_username', v_me.username, 'claimant_email', v_me_email,
    'claimant_joined_at', v_me.created_at, 'claimant_pages', v_my_pages, 'claimant_prior_conflicts', v_prior,
    'risk', v_risk
  );

  insert into public.support_tickets (user_id, subject, category, priority, tags, lang, meta)
  values (
    v_uid,
    format('@%s (%s): %s', v_h, v_label, case when v_es then 'reclamo bloqueado' else 'claim blocked' end),
    'account', 'high', array['claim-conflict'], case when v_es then 'es' else 'en' end, v_meta
  ) returning id, number into v_tid, v_num;

  insert into public.support_messages (ticket_id, author_role, body)
  values (v_tid, 'system', case when v_es
    then format('No pudimos agregar @%s porque otra cuenta de LOT3 Clips ya la reclamó. Nuestro equipo ya fue notificado y lo va a revisar. Si esta página es tuya, responde aquí con una captura de pantalla donde se vea que tienes la sesión iniciada en ella.', v_h)
    else format('We couldn''t add @%s because another LOT3 Clips account has already claimed it. Our team has been notified and will look into it. If this page is yours, reply here with a screenshot of you logged into it.', v_h)
  end);

  insert into public.support_messages (ticket_id, author_role, body, internal)
  values (v_tid, 'system', format(
E'Claim blocked: @%s on %s\n%s\n\nTRYING TO CLAIM\n@%s · %s · joined %s\nPages they hold: %s\nPrevious blocked claims: %s\n\nCURRENT OWNER\n@%s · %s · claimed this page %s · joined %s\nOn this page: %s clips (%s approved) · $%s earned\nOther pages: %s\n\nRISK\n%s\n\nNEXT STEP\nAsk the claimant for a screenshot of them logged into @%s, then use Transfer or Keep at the top of this ticket.',
    v_h, v_label, v_url,
    v_me.username, coalesce(v_me_email, 'no email'), to_char(v_me.created_at, 'Mon DD, YYYY'), v_my_pages, v_prior,
    v_owner.username, coalesce(v_owner_email, 'no email'), to_char(v_acc.created_at, 'Mon DD, YYYY'), to_char(v_owner.created_at, 'Mon DD, YYYY'),
    v_subs, v_appr, to_char(v_earn, 'FM999999990.00'), v_owner_pages,
    v_risk, v_h
  ), true);

  insert into public.activity_log (actor_id, action, entity, entity_id, meta)
  values (v_uid, 'claim.blocked', 'social_account', v_acc.id::text, jsonb_build_object('ticket', v_num, 'handle', v_h, 'platform', p_platform));

  return jsonb_build_object('status','taken','handle',v_h,'ticket',v_num);
end $$;

revoke all on function public.claim_page(text, text, text) from public, anon;
grant execute on function public.claim_page(text, text, text) to authenticated;

-- 6) Saved reply no longer mentions the bio code.
update public.support_saved_replies set
  title = 'Adding a page',
  body = 'To add your page: go to Dashboard → Your pages, pick TikTok, Instagram or YouTube, type your username and tap Claim. It''s active right away and you can start submitting clips.',
  body_es = 'Para agregar tu página: ve a Panel → Tus páginas, elige TikTok, Instagram o YouTube, escribe tu nombre de usuario y toca Reclamar. Queda activa al instante y ya puedes empezar a enviar clips.'
where title = 'Verification help';
