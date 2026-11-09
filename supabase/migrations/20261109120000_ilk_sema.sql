-- Stopscrolling: ilk şema
--
-- İlkeler:
-- * Her kullanıcı tablosunda satır düzeyinde güvenlik (RLS) açık; herkes sadece kendi verisini görür.
-- * İçerik kütüphanesi (tracks, track_days) paylaşılır ve sadece 'live' (insan onaylı) içerik okunabilir.
-- * Raf en fazla 7 öğe alır: kural veritabanında da zorunlu.
-- * Ekranda kalma süresi gibi dikkat sinyalleri saklanmaz; sadece açık geri bildirim ve eylemler.

-- ---------------------------------------------------------------------------
-- İçerik kütüphanesi (paylaşılan)
-- ---------------------------------------------------------------------------

create table public.tracks (
  id text primary key,
  template_title text not null,
  pillar_title text not null,
  identity_phrase text not null,
  description text not null,
  why_placeholder text not null,
  level text not null check (level in ('baslangic', 'orta', 'ileri')),
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'live')),
  weeks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on column public.tracks.status is 'draft → reviewed → live. Sadece live içerik kullanıcılara açılır.';

create table public.track_days (
  track_id text not null references public.tracks (id) on delete cascade,
  day int not null check (day >= 1),
  -- { theme, learn, do, inspire?, reflect } — uygulamadaki TrackDay ile aynı şekil.
  content jsonb not null,
  primary key (track_id, day)
);

-- ---------------------------------------------------------------------------
-- Kullanıcı modeli
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  identity text not null default '',
  baseline_social_hours text,
  timezone text not null default 'Europe/Istanbul',
  created_at timestamptz not null default now()
);

create table public.pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null references public.tracks (id),
  why text not null default '',
  level text not null default 'baslangic' check (level in ('baslangic', 'orta', 'ileri')),
  current_day int not null default 1 check (current_day >= 1),
  created_at timestamptz not null default now(),
  unique (user_id, track_id)
);

-- Tarif: algoritmanın kendisi. Kullanıcı başına tek satır, sürümlü.
create table public.recipes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version int not null default 1 check (version >= 1),
  budget int not null default 10 check (budget in (5, 10, 15)),
  tone text not null default 'nazik' check (tone in ('nazik', 'durust', 'sert')),
  -- { "<track_id>": <göreli ağırlık 0-100> }
  weights jsonb not null default '{}'::jsonb,
  include_inspire boolean not null default true,
  include_reflect boolean not null default true,
  dose_time time not null default '07:30',
  updated_at timestamptz not null default now()
);

create table public.recipe_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  version int not null,
  changed_on date not null,
  changes text[] not null,
  changed_by text not null check (changed_by in ('kullanici', 'oneri')),
  -- Bu sürümün tam hâli: geri dönebilmek için.
  snapshot jsonb not null,
  unique (user_id, version)
);

create table public.doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dose_date date not null,
  recipe_version int not null,
  status text not null default 'hazir' check (status in ('hazir', 'basladi', 'bitti')),
  current_index int not null default 0 check (current_index >= 0),
  -- { "<track_id>": <gün> } — doz bitince sütunlar bu günlerin bir sonrasına ilerler.
  pillar_days jsonb not null default '{}'::jsonb,
  -- Kişiselleştirme servisi metinleri uyarladı mı? (false = kütüphanedeki temel metin)
  personalized boolean not null default false,
  finished_at timestamptz,
  unique (user_id, dose_date)
);

create table public.cards (
  dose_id uuid not null references public.doses (id) on delete cascade,
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  position int not null,
  type text not null check (type in ('ogren', 'uygula', 'ilham', 'yansit', 'tekrar')),
  track_id text not null references public.tracks (id),
  track_day int not null,
  -- { title?, body, source?, action? }
  content jsonb not null,
  why text not null,
  feedback text check (feedback in ('ise_yaradi', 'cok_kolay', 'cok_zor', 'zaten_biliyorum')),
  answer text check (char_length(answer) <= 280),
  decision text check (decision in ('planlandi', 'kucuk', 'rafa', 'gecildi')),
  primary key (dose_id, id)
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dose_id uuid references public.doses (id) on delete set null,
  card_id text not null,
  track_id text not null references public.tracks (id),
  title text not null,
  fallback text not null,
  minutes int not null check (minutes between 1 and 15),
  planned_for date not null,
  planned_time time,
  small boolean not null default false,
  reminder boolean not null default false,
  status text not null check (status in ('planli', 'rafta', 'yapildi', 'kismen', 'yapilmadi', 'birakildi')),
  created_on date not null,
  resolved_on date
);

create index actions_user_planned_idx on public.actions (user_id, planned_for);
create index actions_user_status_idx on public.actions (user_id, status);

create table public.dismissed_suggestions (
  user_id uuid not null references auth.users (id) on delete cascade,
  suggestion_id text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, suggestion_id)
);

-- ---------------------------------------------------------------------------
-- Kural: Raf en fazla 7 öğe alır.
-- ---------------------------------------------------------------------------

create function public.enforce_shelf_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'rafta' and (tg_op = 'INSERT' or old.status is distinct from 'rafta') then
    if (select count(*) from public.actions a where a.user_id = new.user_id and a.status = 'rafta') >= 7 then
      raise exception 'Raf dolu: en fazla 7 öğe alabilir.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger actions_shelf_limit
  before insert or update of status on public.actions
  for each row execute function public.enforce_shelf_limit();

-- ---------------------------------------------------------------------------
-- Satır düzeyinde güvenlik
-- ---------------------------------------------------------------------------

alter table public.tracks enable row level security;
alter table public.track_days enable row level security;
alter table public.profiles enable row level security;
alter table public.pillars enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_changes enable row level security;
alter table public.doses enable row level security;
alter table public.cards enable row level security;
alter table public.actions enable row level security;
alter table public.dismissed_suggestions enable row level security;

-- İçerik: Giriş yapmış herkes sadece yayındaki içeriği okur. Yazma sadece servis rolüyle (inceleme süreci).
create policy "Yayındaki yollar okunabilir" on public.tracks
  for select to authenticated using (status = 'live');

create policy "Yayındaki yolların günleri okunabilir" on public.track_days
  for select to authenticated using (
    exists (select 1 from public.tracks t where t.id = track_id and t.status = 'live')
  );

create policy "Kendi profilim" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Kendi sütunlarım" on public.pillars
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Kendi tarifim" on public.recipes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Kendi tarif geçmişim" on public.recipe_changes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Kendi dozlarım" on public.doses
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Kendi kartlarım" on public.cards
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Kendi eylemlerim" on public.actions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Kendi reddettiğim öneriler" on public.dismissed_suggestions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
