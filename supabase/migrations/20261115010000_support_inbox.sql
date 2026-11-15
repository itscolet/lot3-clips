-- LOT3 Clips — Support inbox
-- Clippers (signed in) and visitors (via a private link) message support; admins triage and reply.
-- Non-admins can only write through the rate-limited support_* functions below.

-- ============ TABLES ============
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  access_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  subject text not null check (char_length(subject) between 3 and 140),
  category text not null default 'other' check (category in ('payouts','campaign','verification','account','bug','brand','other')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  status text not null default 'open' check (status in ('open','waiting','resolved')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  tags text[] not null default '{}',
  lang text not null default 'en' check (lang in ('en','es')),
  message_count int not null default 0,
  last_message_at timestamptz not null default now(),
  last_message_from text,
  preview text,
  unread_admin boolean not null default true,
  unread_user boolean not null default false,
  first_response_at timestamptz,
  resolved_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_email is not null or is_test)
);
create index support_tickets_status_idx on public.support_tickets (status, last_message_at);
create index support_tickets_user_idx on public.support_tickets (user_id, last_message_at desc);
create index support_tickets_guest_idx on public.support_tickets (guest_email, created_at);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('clipper','guest','admin','system')),
  body text not null check (char_length(body) between 1 and 5000),
  internal boolean not null default false,
  attachment_path text,
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create table public.support_saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 5000),
  body_es text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_saved_replies enable row level security;

create policy "support tickets admin" on public.support_tickets for all using (public.is_admin()) with check (public.is_admin());
create policy "support tickets self read" on public.support_tickets for select using (user_id = auth.uid());
create policy "support messages admin" on public.support_messages for all using (public.is_admin()) with check (public.is_admin());
create policy "support messages self read" on public.support_messages for select using (
  not internal and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
);
create policy "support replies admin" on public.support_saved_replies for all using (public.is_admin()) with check (public.is_admin());

-- ============ TRIGGERS: keep ticket state in sync ============
create or replace function public.support_after_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.internal then
    update public.support_tickets set updated_at = now() where id = new.ticket_id;
    return new;
  end if;
  update public.support_tickets set
    last_message_at = new.created_at,
    last_message_from = new.author_role,
    preview = left(regexp_replace(new.body, '\s+', ' ', 'g'), 160),
    message_count = message_count + 1,
    status = case when new.author_role = 'admin' then 'waiting' else 'open' end,
    unread_admin = new.author_role <> 'admin',
    unread_user = case when new.author_role = 'admin' then true else unread_user end,
    first_response_at = case when new.author_role = 'admin' and first_response_at is null then new.created_at else first_response_at end
  where id = new.ticket_id;
  return new;
end $$;
create trigger support_after_message after insert on public.support_messages
  for each row execute function public.support_after_message();

create or replace function public.support_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'resolved' and old.status <> 'resolved' then new.resolved_at := now(); end if;
  if new.status <> 'resolved' then new.resolved_at := null; end if;
  return new;
end $$;
create trigger support_touch before update on public.support_tickets
  for each row execute function public.support_touch();

-- ============ RPCs for clippers & visitors (their only write path) ============
create or replace function public.support_create(
  p_subject text, p_category text, p_body text,
  p_campaign uuid default null, p_guest_name text default null, p_guest_email text default null,
  p_lang text default 'en', p_attachment text default null
) returns table (id uuid, number bigint, access_token text)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.support_tickets;
begin
  p_subject := btrim(coalesce(p_subject, ''));
  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_subject) < 3 then raise exception 'subject_short'; end if;
  if char_length(p_body) < 2 then raise exception 'body_short'; end if;
  if char_length(p_subject) > 140 or char_length(p_body) > 5000 then raise exception 'too_long'; end if;
  if p_category is null or p_category not in ('payouts','campaign','verification','account','bug','brand','other') then p_category := 'other'; end if;
  if p_lang is null or p_lang not in ('en','es') then p_lang := 'en'; end if;
  if p_campaign is not null and not exists (select 1 from public.campaigns c where c.id = p_campaign and c.status <> 'draft') then p_campaign := null; end if;

  if v_uid is null then
    p_guest_email := lower(btrim(coalesce(p_guest_email, '')));
    p_guest_name := btrim(coalesce(p_guest_name, ''));
    if p_guest_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(p_guest_email) > 200 then raise exception 'bad_email'; end if;
    if char_length(p_guest_name) < 1 or char_length(p_guest_name) > 80 then raise exception 'name_required'; end if;
    if (select count(*) from public.support_tickets t where t.guest_email = p_guest_email and t.created_at > now() - interval '1 day') >= 5 then raise exception 'rate_limited'; end if;
    if (select count(*) from public.support_tickets t where t.user_id is null and t.created_at > now() - interval '1 hour') >= 40 then raise exception 'rate_limited'; end if;
    p_attachment := null;
  else
    if (select count(*) from public.support_tickets t where t.user_id = v_uid and t.created_at > now() - interval '1 day') >= 15 then raise exception 'rate_limited'; end if;
    p_guest_email := null; p_guest_name := null;
    if p_attachment is not null and split_part(p_attachment, '/', 1) <> v_uid::text then p_attachment := null; end if;
  end if;

  insert into public.support_tickets (user_id, guest_name, guest_email, subject, category, campaign_id, lang)
  values (v_uid, nullif(p_guest_name, ''), nullif(p_guest_email, ''), p_subject, p_category, p_campaign, p_lang)
  returning * into v_t;
  insert into public.support_messages (ticket_id, author_id, author_role, body, attachment_path)
  values (v_t.id, v_uid, case when v_uid is null then 'guest' else 'clipper' end, p_body, p_attachment);
  return query select v_t.id, v_t.number, v_t.access_token;
end $$;

create or replace function public.support_reply(p_ticket uuid, p_body text, p_token text default null, p_attachment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.support_tickets; v_role text; v_id uuid;
begin
  select * into v_t from public.support_tickets t where t.id = p_ticket;
  if v_t.id is null then raise exception 'not_found'; end if;
  if v_uid is not null and v_t.user_id = v_uid then v_role := 'clipper';
  elsif v_t.user_id is null and p_token is not null and v_t.access_token = p_token then v_role := 'guest'; p_attachment := null;
  else raise exception 'not_found'; end if;
  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_body) < 1 then raise exception 'body_short'; end if;
  if char_length(p_body) > 5000 then raise exception 'too_long'; end if;
  if (select count(*) from public.support_messages m where m.ticket_id = p_ticket and m.author_role = v_role and m.created_at > now() - interval '10 minutes') >= 20 then raise exception 'rate_limited'; end if;
  if p_attachment is not null and split_part(p_attachment, '/', 1) <> v_uid::text then p_attachment := null; end if;
  insert into public.support_messages (ticket_id, author_id, author_role, body, attachment_path)
  values (p_ticket, v_uid, v_role, p_body, p_attachment) returning id into v_id;
  return v_id;
end $$;

-- Ticket owner (signed in) or visitor with the private link: mark read / resolve.
create or replace function public.support_user_action(p_ticket uuid, p_action text, p_token text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.support_tickets;
begin
  select * into v_t from public.support_tickets t where t.id = p_ticket;
  if v_t.id is null or not ((v_uid is not null and v_t.user_id = v_uid) or (v_t.user_id is null and p_token is not null and v_t.access_token = p_token)) then
    raise exception 'not_found';
  end if;
  if p_action = 'read' then
    update public.support_tickets set unread_user = false where id = p_ticket and unread_user;
  elsif p_action = 'resolve' then
    update public.support_tickets set status = 'resolved', unread_user = false where id = p_ticket;
  else
    raise exception 'bad_action';
  end if;
end $$;

-- Visitor thread by private link (never includes internal notes).
create or replace function public.support_thread(p_token text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'ticket', json_build_object('id', t.id, 'number', t.number, 'subject', t.subject, 'category', t.category, 'status', t.status,
                                'guest_name', t.guest_name, 'created_at', t.created_at, 'unread_user', t.unread_user),
    'messages', coalesce((select json_agg(json_build_object('id', m.id, 'author_role', m.author_role, 'body', m.body, 'created_at', m.created_at) order by m.created_at)
                          from public.support_messages m where m.ticket_id = t.id and not m.internal), '[]'::json)
  )
  from public.support_tickets t
  where p_token is not null and char_length(p_token) >= 24 and t.access_token = p_token and t.user_id is null;
$$;

-- Admin-only: a clipper's sign-in email, for the context panel.
create or replace function public.admin_user_email(p_user uuid)
returns text language sql stable security definer set search_path = public, auth as $$
  select u.email::text from auth.users u where u.id = p_user and public.is_admin();
$$;

revoke all on function public.support_create(text,text,text,uuid,text,text,text,text) from public;
revoke all on function public.support_reply(uuid,text,text,text) from public;
revoke all on function public.support_user_action(uuid,text,text) from public;
revoke all on function public.support_thread(text) from public;
revoke all on function public.admin_user_email(uuid) from public;
revoke all on function public.support_after_message() from public;
grant execute on function public.support_create(text,text,text,uuid,text,text,text,text) to anon, authenticated;
grant execute on function public.support_reply(uuid,text,text,text) to anon, authenticated;
grant execute on function public.support_user_action(uuid,text,text) to anon, authenticated;
grant execute on function public.support_thread(text) to anon, authenticated;
grant execute on function public.admin_user_email(uuid) to authenticated;

-- ============ STORAGE: private screenshots ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support', 'support', false, 8388608, array['image/png','image/jpeg','image/webp','image/heic','image/gif'])
on conflict (id) do nothing;
create policy "support own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'support' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "support own read" on storage.objects for select
  using (bucket_id = 'support' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ============ STARTER SAVED REPLIES (English + Spanish) ============
insert into public.support_saved_replies (title, body, body_es, sort) values
('When do I get paid?',
 'Hey! Earnings stay pending while a campaign is live. Once the campaign wraps and is marked complete, your balance becomes available and we send payouts within a few days to the method in Dashboard → Payouts. Make sure your payout details are filled in there.',
 '¡Hola! Tus ganancias quedan pendientes mientras la campaña está activa. Cuando la campaña termina y se marca como finalizada, tu saldo queda disponible y enviamos los pagos en unos pocos días al método que tengas en Panel → Pagos. Asegúrate de tener tus datos de pago completos ahí.', 1),
('Clip rejected — wrong sound',
 'Thanks for submitting! This clip was rejected because it doesn''t use the campaign sound. Open the campaign page, tap "Open sound", post a new clip using that exact sound, then submit the new link.',
 '¡Gracias por enviarlo! Este clip fue rechazado porque no usa el sonido de la campaña. Abre la página de la campaña, toca "Abrir sonido", publica un clip nuevo con ese sonido exacto y luego envía el nuevo enlace.', 2),
('Verification help',
 'To verify your page: go to Dashboard → Connected accounts, copy your code, paste it anywhere in that account''s bio, save, wait about a minute, then tap Verify. Once it says Verified you can remove the code.',
 'Para verificar tu página: ve a Panel → Cuentas conectadas, copia tu código, pégalo en cualquier parte de la bio de esa cuenta, guarda, espera más o menos un minuto y toca Verificar. Cuando diga Verificada, ya puedes quitar el código.', 3),
('US audience screenshot',
 'For US-only campaigns we need a screenshot of your audience locations. TikTok: Analytics → Followers. Instagram: Insights → Total followers. Upload it under Dashboard → Connected accounts and we''ll review it within 24 hours.',
 'Para las campañas solo de EE. UU. necesitamos una captura de pantalla de la ubicación de tu audiencia. TikTok: Estadísticas → Seguidores. Instagram: Estadísticas → Seguidores totales. Súbela en Panel → Cuentas conectadas y la revisaremos en un plazo de 24 horas.', 4),
('All sorted',
 'All sorted on our end, so I''ll mark this as resolved. If anything else comes up, just reply here and it''ll reopen.',
 'Ya quedó resuelto de nuestro lado, así que voy a marcar esto como resuelto. Si surge algo más, solo responde aquí y se volverá a abrir.', 5);

-- Supabase grants EXECUTE to anon/authenticated by default; keep internal functions private.
revoke execute on function public.admin_user_email(uuid) from anon;
revoke execute on function public.support_after_message() from anon, authenticated;
revoke execute on function public.support_touch() from anon, authenticated;
