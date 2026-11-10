#!/usr/bin/env node
// content/tracks/*.json → supabase/seed.sql
//
// İçeriğin tek doğruluk kaynağı git'teki JSON dosyaları. Bu betik onları veritabanına
// aktaracak SQL'i üretir. `supabase db reset` seed.sql'i otomatik çalıştırır.
//
// Kullanım: node supabase/scripts/build-seed.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tracksDir = join(here, '../../content/tracks');
const outFile = join(here, '../seed.sql');

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${q(JSON.stringify(value))}::jsonb`;
const textArray = (values) => `array[${values.map(q).join(', ')}]::text[]`;

const traitsFile = join(here, '../../content/traits.json');
const files = readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort();
const lines = [
  '-- Bu dosya otomatik üretilir: node supabase/scripts/build-seed.mjs',
  '-- Elle düzenleme; kaynak content/tracks/*.json',
  '',
];

for (const file of files) {
  const track = JSON.parse(readFileSync(join(tracksDir, file), 'utf8'));
  lines.push(`-- ${track.templateTitle} (${file})`);
  lines.push(
    `insert into public.tracks (id, template_title, pillar_title, identity_phrase, description, why_placeholder, keywords, level_question, level, status, weeks)
values (${[
      q(track.id),
      q(track.templateTitle),
      q(track.pillarTitle),
      q(track.identityPhrase),
      q(track.description),
      q(track.whyPlaceholder),
      textArray(track.keywords),
      json(track.levelQuestion),
      q(track.level),
      q(track.status),
      json(track.weeks),
    ].join(', ')})
on conflict (id) do update set
  template_title = excluded.template_title, pillar_title = excluded.pillar_title,
  identity_phrase = excluded.identity_phrase, description = excluded.description,
  why_placeholder = excluded.why_placeholder, keywords = excluded.keywords,
  level_question = excluded.level_question, level = excluded.level,
  status = excluded.status, weeks = excluded.weeks, updated_at = now();`,
  );
  for (const { day, ...content } of track.days) {
    lines.push(
      `insert into public.track_days (track_id, day, content) values (${q(track.id)}, ${day}, ${json(content)})
on conflict (track_id, day) do update set content = excluded.content;`,
    );
  }
  lines.push('');
}

// Özellik kataloğu (yollardan sonra: track_ids yolları gösterir)
const { traits } = JSON.parse(readFileSync(traitsFile, 'utf8'));
lines.push('-- Özellik kataloğu (content/traits.json)');
traits.forEach((trait, position) => {
  lines.push(
    `insert into public.traits (id, label, track_ids, position) values (${q(trait.id)}, ${q(trait.label)}, ${textArray(trait.tracks)}, ${position})
on conflict (id) do update set label = excluded.label, track_ids = excluded.track_ids, position = excluded.position;`,
  );
});
lines.push('');

writeFileSync(outFile, lines.join('\n'));
console.log(`${files.length} yol ve ${traits.length} özellik yazıldı → ${outFile}`);
