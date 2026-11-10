/**
 * Kurulum: Kullanıcı kendini anlatır, sistem yol önerir, kullanıcı onaylar.
 *
 * Sistem kullanıcıyı üç kaynaktan tanır:
 * 1. Seçtiği özellikler ("Olmak istediğin sen") → her özellik bir ya da birkaç yola bağlı.
 * 2. Kendi cümleleri (şu anki hâli, 5 yıl sonraki bir günü) → anahtar kelimelerle yollara eşlenir.
 * 3. Sonra: yaptıkları (geri bildirim, tamamlanan eylemler) → tarif önerileri (metrics.ts).
 *
 * Her öneri gerekçesiyle gösterilir; karşılığı olmayan hedefler gizlenmez, dürüstçe söylenir.
 * Şimdilik kural tabanlı ve cihazda çalışır. Kişiselleştirme servisi bağlandığında aynı bilgiler
 * kart metinlerini uyarlamak için de kullanılacak.
 */
import { composeIdentity } from './recipe';
import { capitalizeTurkish, toTurkishLower } from './turkce';
import type { Level, ProductiveTime, TimeOfDay, Track, Trait } from './types';

export const TIME_SINKS = ['Sosyal medya', 'Video ve dizi', 'Oyun', 'Haberler', 'Mesajlaşma', 'Alışveriş'];

export const PRODUCTIVE_TIMES: { value: ProductiveTime; label: string; doseTime: TimeOfDay }[] = [
  { value: 'sabah', label: 'Sabah', doseTime: '07:30' },
  { value: 'ogle', label: 'Öğlen', doseTime: '12:30' },
  { value: 'aksam', label: 'Akşam', doseTime: '20:00' },
  { value: 'gece', label: 'Gece', doseTime: '20:00' },
];

export const MAX_TRAITS = 5;

/** Metni Türkçe kurallarla küçültüp kelimelere böler. */
export function tokenize(text: string): string[] {
  return toTurkishLower(text)
    .split(/[^a-zçğıöşüâîûé0-9]+/)
    .filter(Boolean);
}

/**
 * Kullanıcının metninde geçen ve anahtar kelimelerle eşleşen kelimeleri döndürür.
 * "kok*" → kökle başlayan kelime ("telefon*" → "telefonda"); yıldızsız → tam kelime.
 */
export function matchKeywords(text: string, keywords: string[]): string[] {
  const words = tokenize(text);
  const hits: string[] = [];
  for (const keyword of keywords) {
    const k = toTurkishLower(keyword);
    const isPrefix = k.endsWith('*');
    const stem = isPrefix ? k.slice(0, -1) : k;
    const found = words.find((w) => (isPrefix ? w.startsWith(stem) : w === stem));
    if (found && !hits.includes(found)) hits.push(found);
  }
  return hits;
}

export interface TrackSuggestion {
  trackId: string;
  score: number;
  /** Bu yolu doğuran, kullanıcının seçtiği özellikler (etiket). */
  traits: string[];
  /** Kullanıcının yazdıklarında geçen, bu yolla eşleşen kelimeler. */
  words: string[];
}

/**
 * Yol önerisi. Puan: Özelliğin ana yolu +2, ikincil yolu +1; yazılan metinde eşleşen her kelime +1 (en fazla 3).
 * Yazılanlar seçilen özelliklerden daha az ağırlık taşır: Kullanıcının açık seçimi önce gelir.
 */
export function suggestTracks({
  desiredTraits,
  texts,
  traits,
  tracks,
}: {
  desiredTraits: string[];
  texts: string[];
  traits: Trait[];
  tracks: Track[];
}): { suggestions: TrackSuggestion[]; unmetTraits: Trait[] } {
  const catalog = new Map(traits.map((t) => [t.id, t]));
  const chosen = desiredTraits.map((id) => catalog.get(id)).filter((t): t is Trait => !!t);
  const text = texts.join(' ');

  const suggestions = tracks
    .map((track): TrackSuggestion => {
      const traitHits = chosen.filter((t) => t.tracks.includes(track.id));
      const traitScore = traitHits.reduce((sum, t) => sum + (t.tracks[0] === track.id ? 2 : 1), 0);
      const words = matchKeywords(text, track.keywords);
      return {
        trackId: track.id,
        score: traitScore + Math.min(3, words.length),
        traits: traitHits.map((t) => t.label),
        words,
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.trackId.localeCompare(b.trackId));

  return { suggestions, unmetTraits: chosen.filter((t) => t.tracks.length === 0) };
}

/**
 * Başlangıçta işaretli gelen yollar: Doğrudan bir özelliğe dayanan (puanı ≥ 2) en güçlü 2 yol.
 * Ne kadar az, o kadar iyi; kullanıcı en fazla 3'e çıkarabilir.
 */
export function defaultSelection(suggestions: TrackSuggestion[], max = 2): string[] {
  return suggestions
    .filter((s) => s.score >= 2)
    .slice(0, max)
    .map((s) => s.trackId);
}

/** Önerinin gerekçesi: "Seçtiğin özellikler: Odaklı, Sakin · Yazdıklarından: “telefonda”" */
export function describeSuggestion(s: TrackSuggestion): string {
  const parts: string[] = [];
  if (s.traits.length) parts.push(`Seçtiğin özellikler: ${s.traits.join(', ')}`);
  if (s.words.length) parts.push(`Yazdıklarından: ${s.words.map((w) => `“${w}”`).join(', ')}`);
  return parts.join(' · ');
}

/** Somut seviye sorusunun şıkkı → seviye. */
export function levelFromAnswer(index: number): Level {
  return index >= 2 ? 'ileri' : index === 1 ? 'orta' : 'baslangic';
}

/** "Ben odaklı, sakin ve okuyan biriyim." Özellik yoksa yolların kimlik ifadeleri kullanılır. */
export function identityFromTraits(traitLabels: string[], fallbackPhrases: string[]): string {
  const phrases = traitLabels.length ? traitLabels.map(toTurkishLower) : fallbackPhrases;
  return composeIdentity(phrases);
}

/** "Odaklı ve sakin biri olmak istediğin için" */
export function motivationPhrase(traitLabels: string[]): string {
  if (traitLabels.length === 0) return '';
  const lower = traitLabels.map(toTurkishLower);
  const list = lower.length === 1 ? lower[0] : `${lower.slice(0, -1).join(', ')} ve ${lower[lower.length - 1]}`;
  return capitalizeTurkish(`${list} biri olmak istediğin için`);
}
