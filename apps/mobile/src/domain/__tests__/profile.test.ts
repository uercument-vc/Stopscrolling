import { TRACK_LIST, TRAITS } from '@/content/library';

import { buildDose } from '../dose-builder';
import {
  defaultSelection,
  describeSuggestion,
  identityFromTraits,
  levelFromAnswer,
  matchKeywords,
  motivationPhrase,
  suggestTracks,
  tokenize,
} from '../profile';
import { toTurkishLower } from '../turkce';
import { makePillar, makeRecipe, makeTrack } from './fixtures';

const suggest = (desiredTraits: string[], ...texts: string[]) =>
  suggestTracks({ desiredTraits, texts, traits: TRAITS, tracks: TRACK_LIST });

describe('Türkçe metin eşleme', () => {
  it('Türkçe kurallarla küçültür ve kelimelere böler', () => {
    expect(toTurkishLower('İSTANBUL IŞIK')).toBe('istanbul ışık');
    expect(tokenize('Akşamları TELEFONDA kayboluyorum!')).toEqual(['akşamları', 'telefonda', 'kayboluyorum']);
  });

  it('kök (*) kelimenin başını, yıldızsız anahtar kelimenin tamamını eşler', () => {
    expect(matchKeywords('Akşamları telefonda kayboluyorum', ['telefon*'])).toEqual(['telefonda']);
    // "yazı" tam kelime: "yazılım" ile eşleşmemeli
    expect(matchKeywords('Yazılım öğrenmek istiyorum', ['yazı'])).toEqual([]);
    expect(matchKeywords('Her gün yazı yazmak istiyorum', ['yazı'])).toEqual(['yazı']);
    expect(matchKeywords('İnstagram ve KİTAPLAR', ['instagram*', 'kitap*'])).toEqual(['instagram', 'kitaplar']);
  });
});

describe('yol önerisi', () => {
  it('seçilen özellikler doğru yollara gider; ana yol ikincilden önce gelir', () => {
    const { suggestions } = suggest(['odakli', 'sakin', 'okuyan']);
    expect(suggestions.map((s) => [s.trackId, s.score])).toEqual([
      ['odaklanan-biri', 4],
      ['okuyan-biri', 2],
    ]);
    expect(suggestions[0].traits).toEqual(['Odaklı', 'Sakin']);
  });

  it('yazılan metin de öneriye katkı verir ve gerekçede görünür', () => {
    const { suggestions } = suggest(['merakli'], 'Akşamları telefonda kayboluyorum', 'Kendi uygulamamı kodluyorum');
    const odak = suggestions.find((s) => s.trackId === 'odaklanan-biri')!;
    expect(odak.words).toEqual(['telefonda']);
    expect(describeSuggestion(odak)).toBe('Yazdıklarından: “telefonda”');
    const yazilim = suggestions.find((s) => s.trackId === 'yazilim-ogrenen-biri')!;
    // "uygulama" bilerek tam kelime: "uygulamada vakit geçiriyorum" Yazılım yolunu önermemeli.
    expect(describeSuggestion(yazilim)).toBe('Seçtiğin özellikler: Meraklı · Yazdıklarından: “kodluyorum”');
    expect(matchKeywords('Bu uygulamada çok vakit geçiriyorum', ['uygulama'])).toEqual([]);
  });

  it('yolu olmayan hedefleri gizlemez, ayrıca döndürür', () => {
    const { suggestions, unmetTraits } = suggest(['sabirli', 'kendine-guvenen']);
    expect(suggestions).toEqual([]);
    expect(unmetTraits.map((t) => t.label)).toEqual(['Sabırlı', 'Kendine güvenen']);
  });

  it('başlangıçta en fazla 2 yol işaretlenir ve sadece doğrudan özellikten gelenler', () => {
    const { suggestions } = suggest(['odakli', 'okuyan', 'formda', 'yaratici']);
    expect(defaultSelection(suggestions)).toHaveLength(2);
    // Sadece metinden gelen zayıf eşleşme işaretli gelmez
    const weak = suggest([], 'kitap okumak istiyorum').suggestions;
    expect(weak.map((s) => s.trackId)).toEqual(['okuyan-biri']);
    expect(defaultSelection(weak)).toEqual(['okuyan-biri']);
    expect(defaultSelection(suggest([], 'telefon').suggestions)).toEqual([]);
  });

  it('her özellik kataloğda var olan yollara bağlı', () => {
    const ids = new Set(TRACK_LIST.map((t) => t.id));
    for (const trait of TRAITS) for (const id of trait.tracks) expect(ids.has(id)).toBe(true);
    // Her hazır yola en az bir özellik bağlı
    for (const id of ids) expect(TRAITS.some((t) => t.tracks.includes(id))).toBe(true);
  });
});

describe('kimlik ve motivasyon cümleleri', () => {
  it('özelliklerden Türkçe kimlik cümlesi kurar', () => {
    expect(identityFromTraits(['Odaklı', 'Sakin', 'İyi uyuyan'], [])).toBe('Ben odaklı, sakin ve iyi uyuyan biriyim.');
    expect(identityFromTraits([], ['her gün okuyan'])).toBe('Ben her gün okuyan biriyim.');
  });

  it('"neden" cümlesi kurar', () => {
    expect(motivationPhrase(['Odaklı', 'Sakin'])).toBe('Odaklı ve sakin biri olmak istediğin için');
    expect(motivationPhrase(['İyi uyuyan'])).toBe('İyi uyuyan biri olmak istediğin için');
    expect(motivationPhrase([])).toBe('');
  });

  it('somut seviye cevabı seviyeye çevrilir', () => {
    expect([0, 1, 2].map(levelFromAnswer)).toEqual(['baslangic', 'orta', 'ileri']);
  });

  it('kartın "Bunu neden görüyorum?" açıklamasında kullanıcının özellikleri yer alır', () => {
    const pillar = { ...makePillar('a'), motivatedBy: ['Odaklı', 'Sakin'] };
    const dose = buildDose({
      date: '2026-11-10',
      pillars: [pillar],
      recipe: makeRecipe({ weights: { a: 1 } }),
      tracks: { a: makeTrack('a') },
      shownCounts: {},
    });
    expect(dose.cards[0].why).toBe('A sütunun (%100) · Odaklı ve sakin biri olmak istediğin için · Yol: 1. hafta, 1. gün, "Tema 1"');
  });
});
