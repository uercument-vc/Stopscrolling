-- Kurulum profili: Kullanıcı kendini anlatır, sistem yol önerir.
--
-- * traits: "Olmak istediğin sen" adımındaki özellik kataloğu (content/traits.json).
--   track_ids boşsa henüz yolu yok; kullanıcılar bunu seçtikçe içerik yol haritası için talep oluşur.
-- * tracks: Serbest metinden öneri için anahtar kelimeler ve somut seviye sorusu.
-- * profiles: Şu anki sen + olmak istediğin sen.
-- * pillars: Sütunu doğuran özellikler ("Bunu neden görüyorum?" açıklamasında gösterilir).

alter table public.tracks
  add column keywords text[] not null default '{}',
  add column level_question jsonb;

create table public.traits (
  id text primary key,
  label text not null,
  -- Bu özelliği besleyen yollar; ilk sıradaki ana yol. Yabancı anahtar kullanılmadı çünkü dizi.
  track_ids text[] not null default '{}',
  position int not null default 0
);

alter table public.traits enable row level security;

create policy "Özellik kataloğu okunabilir" on public.traits
  for select to authenticated using (true);

alter table public.profiles
  add column time_sinks text[] not null default '{}',
  add column productive_time text check (productive_time in ('sabah', 'ogle', 'aksam', 'gece')),
  add column self_description text check (char_length(self_description) <= 300),
  add column desired_traits text[] not null default '{}' check (cardinality(desired_traits) <= 5),
  add column future_day text check (char_length(future_day) <= 400);

alter table public.pillars
  add column motivated_by text[] not null default '{}';

-- İçerik ekibi için: Hangi hedefler için yol bekleniyor? (Kişisel veri içermez, sadece sayım.)
-- security_invoker: Görünüm, sorgulayanın yetkileriyle çalışır; RLS'yi atlamaz.
create view public.trait_demand with (security_invoker = true) as
select t.id, t.label, cardinality(t.track_ids) = 0 as yolu_yok, count(p.id) as kullanici_sayisi
from public.traits t
left join public.profiles p on t.id = any (p.desired_traits)
group by t.id, t.label, t.track_ids;

comment on view public.trait_demand is
  'Özellik başına kaç kullanıcının bu hedefi seçtiği. RLS nedeniyle normal kullanıcı sadece kendi satırını sayar; içerik ekibi servis rolüyle sorgular.';
