-- Şema + seed + RLS duman testi. Docker/Supabase gerektirmez; düz bir PostgreSQL yeter.
-- Supabase auth şemasının minimal bir taklidini kurar, sonra göçü ve seed'i çalıştırır.
-- Çalıştırmak için: supabase/scripts/rls-smoke-test.sh
\set ON_ERROR_STOP on
-- Supabase'in auth şemasını taklit eden minimal kurulum
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

\i :migration
\i :seed

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;

insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
update public.tracks set status = 'live' where id = 'okuyan-biri';

-- Seed ikinci kez çalışınca çakışmamalı (idempotent)
\i :seed
update public.tracks set status = 'live' where id = 'okuyan-biri';
do $$ begin
  if (select count(*) from public.tracks) <> 5 or (select count(*) from public.track_days) <> 35 then
    raise exception 'HATA: seed beklenen 5 yol / 35 gün değil';
  end if;
  raise notice 'OK: seed iki kez çalıştı, 5 yol / 35 gün';
end $$;

-- Kullanıcı B'nin verisi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.pillars (user_id, track_id) values (auth.uid(), 'okuyan-biri');
insert into public.actions (user_id, card_id, track_id, title, fallback, minutes, planned_for, status, created_on)
values (auth.uid(), 'k', 'okuyan-biri', 'B eylemi', 'küçük', 5, '2026-11-09', 'planli', '2026-11-09');

-- Kullanıcı A
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.actions) <> 0 then raise exception 'HATA: A, B''nin eylemlerini görüyor'; end if;
  if (select string_agg(id, ',') from public.tracks) <> 'okuyan-biri' then raise exception 'HATA: live olmayan yol görünüyor'; end if;
  if (select count(*) from public.track_days) <> 7 then raise exception 'HATA: live yolun günleri eksik/fazla'; end if;
  raise notice 'OK: A sadece kendi verisini ve yayındaki içeriği görüyor';
end $$;

-- A başkası adına satır ekleyemez
do $$ begin
  insert into public.pillars (user_id, track_id) values ('00000000-0000-0000-0000-00000000000b', 'okuyan-biri');
  raise exception 'HATA: başkası adına ekleme yapılabildi';
exception when insufficient_privilege then raise notice 'OK: başkası adına ekleme engellendi';
end $$;

-- Raf sınırı: 7 olur, 8. reddedilir
insert into public.actions (user_id, card_id, track_id, title, fallback, minutes, planned_for, status, created_on)
select auth.uid(), 'k' || g, 'okuyan-biri', 'Raf ' || g, 'küçük', 5, '2026-11-12', 'rafta', '2026-11-09' from generate_series(1, 7) g;
do $$ begin
  insert into public.actions (user_id, card_id, track_id, title, fallback, minutes, planned_for, status, created_on)
  values (auth.uid(), 'k8', 'okuyan-biri', 'Raf 8', 'küçük', 5, '2026-11-12', 'rafta', '2026-11-09');
  raise exception 'HATA: 8. raf öğesi eklenebildi';
exception when check_violation then raise notice 'OK: 8. raf öğesi reddedildi (%)', sqlerrm;
end $$;

-- Eylem 15 dakikayı aşamaz
do $$ begin
  insert into public.actions (user_id, card_id, track_id, title, fallback, minutes, planned_for, status, created_on)
  values (auth.uid(), 'uzun', 'okuyan-biri', 'Uzun', 'küçük', 45, '2026-11-12', 'planli', '2026-11-09');
  raise exception 'HATA: 45 dakikalık eylem eklenebildi';
exception when check_violation then raise notice 'OK: 15 dakikadan uzun eylem reddedildi';
end $$;
reset role;
