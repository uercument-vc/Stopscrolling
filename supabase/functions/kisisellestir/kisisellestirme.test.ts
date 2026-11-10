// Çalıştırmak için: deno test supabase/functions/kisisellestir/
import assert from 'node:assert/strict';

import {
  buildUserMessage,
  type CallModel,
  hasCrisisSignal,
  mergeCards,
  type ModelOutput,
  PersonalizeInput,
  personalizeDose,
} from './kisisellestirme.ts';

const input = PersonalizeInput.parse({
  date: '2026-11-09',
  identity: 'Ben her gün okuyan biriyim.',
  tone: 'nazik',
  pillars: [{ id: 'okuyan-biri', title: 'Okuma', why: 'Daha derin düşünmek istiyorum.', level: 'baslangic' }],
  cards: [
    {
      id: '2026-11-09:okuyan-biri:ogren',
      type: 'ogren',
      pillarId: 'okuyan-biri',
      title: '2 dakika kuralı',
      body: 'Yeni bir alışkanlığa başlarken onu 2 dakikadan kısa sürecek kadar küçült.',
      source: 'James Clear, Atomik Alışkanlıklar (2018)',
      why: 'Okuma sütunun (%100)',
    },
    {
      id: '2026-11-09:okuyan-biri:uygula',
      type: 'uygula',
      pillarId: 'okuyan-biri',
      title: 'Sadece bir sayfa',
      body: 'Bu akşam kitabını aç ve sadece bir sayfa oku.',
      why: 'Uygulama kartı',
      action: { title: 'Kitabından 1 sayfa oku', fallback: 'Bir paragraf oku', minutes: 2, suggestedTime: '21:30' },
    },
  ],
});

function output(cards: Partial<ModelOutput['cards'][number]>[]): ModelOutput {
  return {
    cards: cards.map((c) => ({
      id: '',
      title: null,
      body: '',
      action_title: null,
      action_fallback: null,
      personal_note: '',
      ...c,
    })),
  };
}

Deno.test('model metinleri uyarlar; tür, süre, kaynak ve kimlik değişmez', async () => {
  const fake: CallModel = async () => ({
    ok: true,
    output: output([
      {
        id: '2026-11-09:okuyan-biri:ogren',
        title: '2 dakika kuralı',
        body: 'Daha derin düşünmek istediğini söylemiştin. Bunun ilk adımı küçük başlamak: alışkanlığı 2 dakikaya indir.',
        personal_note: 'Nedenine bağlandı.',
      },
      {
        id: '2026-11-09:okuyan-biri:uygula',
        title: 'Sadece bir sayfa',
        body: 'Bu akşam yatmadan önce kitabını aç ve bir sayfa oku.',
        action_title: 'Yatmadan önce 1 sayfa oku',
        action_fallback: 'Kitabı aç, bir paragraf oku',
      },
    ]),
  });

  const result = await personalizeDose(input, fake);
  assert.equal(result.safety, 'ok');
  assert.equal(result.personalizedCount, 2);
  assert.match(result.cards[0].body, /Daha derin düşünmek/);
  assert.equal(result.cards[0].source, input.cards[0].source);
  assert.equal(result.cards[0].why, 'Okuma sütunun (%100) · Nedenine bağlandı.');
  assert.equal(result.cards[1].action?.title, 'Yatmadan önce 1 sayfa oku');
  assert.equal(result.cards[1].action?.minutes, 2);
  assert.equal(result.cards[1].action?.suggestedTime, '21:30');
  assert.deepEqual(
    result.cards.map((c) => [c.id, c.type]),
    input.cards.map((c) => [c.id, c.type]),
  );
});

Deno.test('eksik kart, yasaklı ifade ve aşırı uzun metin temel metinde kalır', () => {
  const merged = mergeCards(
    input.cards,
    output([
      { id: '2026-11-09:okuyan-biri:ogren', body: 'İnanırsan başarırsın! Hemen başla.' },
      // uygula kartı hiç dönmedi
      { id: 'uydurma-kart', body: 'Bu kart temel dozda yok.' },
    ]),
  );
  assert.deepEqual(merged.cards, input.cards);
  assert.equal(merged.personalizedCount, 0);

  const long = mergeCards(input.cards, output([{ id: '2026-11-09:okuyan-biri:ogren', body: 'uzun '.repeat(400) }]));
  assert.equal(long.cards[0].body, input.cards[0].body);
});

Deno.test('model reddederse ya da hata verirse temel doz döner', async () => {
  for (const reason of ['red', 'gecersiz_cikti', 'model_hatasi'] as const) {
    const result = await personalizeDose(input, async () => ({ ok: false, reason }));
    assert.deepEqual(result.cards, input.cards);
    assert.equal(result.fallbackReason, reason);
    assert.equal(result.safety, 'ok');
  }
});

Deno.test('yansıtmalarda kriz işareti varsa model hiç çağrılmaz', async () => {
  let called = false;
  const result = await personalizeDose(
    { ...input, recentReflections: ['Bazen yaşamak istemiyorum.'] },
    async () => {
      called = true;
      return { ok: false, reason: 'model_hatasi' };
    },
  );
  assert.equal(called, false);
  assert.equal(result.safety, 'kriz');
  assert.deepEqual(result.cards, input.cards);
  assert.equal(hasCrisisSignal(['Bugün telefonu bırakmak zordu.']), false);
  // Büyük harfle başlayan Türkçe ifade de yakalanmalı (İ → i).
  assert.equal(hasCrisisSignal(['İntihar etmeyi düşündüm']), true);
});

Deno.test('girdi şeması: en fazla 3 sütun, eylem en fazla 15 dakika', () => {
  const tooMany = { ...input, pillars: [...input.pillars, ...input.pillars, ...input.pillars, ...input.pillars] };
  assert.equal(PersonalizeInput.safeParse(tooMany).success, false);

  const longAction = structuredClone(input);
  longAction.cards[1].action!.minutes = 45;
  assert.equal(PersonalizeInput.safeParse(longAction).success, false);
});

Deno.test('kurulum profili modele gider; kimlik bilgisi alanı yok', () => {
  const withProfile = PersonalizeInput.parse({
    ...input,
    pillars: [{ ...input.pillars[0], motivatedBy: ['Odaklı', 'Sakin'] }],
    profile: {
      desiredTraits: ['Odaklı', 'Sakin', 'Okuyan'],
      selfDescription: 'Akşamları yorgun oluyorum ve telefonda kayboluyorum.',
      futureDay: 'Sabah kitap okuyorum.',
      timeSinks: ['Sosyal medya'],
    },
  });
  const message = buildUserMessage(withProfile);
  assert.match(message, /"olmak_istedigi": \[\s*"Odaklı"/);
  assert.match(message, /Akşamları yorgun oluyorum/);
  assert.match(message, /"bu_sutunu_doguran_ozellikler"/);
  assert.doesNotMatch(message, /e-?posta|email|isim/i);

  // Profil isteğe bağlı: Eski istemciler göndermese de geçerli.
  assert.equal(PersonalizeInput.safeParse(input).success, true);
  // 6 özellik reddedilir.
  const tooMany = { ...withProfile, profile: { ...withProfile.profile!, desiredTraits: ['a', 'b', 'c', 'd', 'e', 'f'] } };
  assert.equal(PersonalizeInput.safeParse(tooMany).success, false);
});
