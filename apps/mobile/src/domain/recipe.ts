import type { DailyBudget, Pillar, Recipe, Tone } from './types';

export const TONE_LABELS: Record<Tone, string> = {
  nazik: 'Nazik arkadaş',
  durust: 'Dürüst koç',
  sert: 'Sert antrenör',
};

export const BUDGETS: DailyBudget[] = [5, 10, 15];

/** Günlük bütçe, dozda kaç sütuna yer olduğunu belirler. */
export function slotsForBudget(budget: DailyBudget): number {
  return budget === 5 ? 1 : budget === 10 ? 2 : 3;
}

/** Eşit dağıtılmış başlangıç ağırlıkları (toplam 100). */
export function equalWeights(ids: string[]): Record<string, number> {
  const base = Math.floor(100 / ids.length);
  const remainder = 100 - base * ids.length;
  return Object.fromEntries(ids.map((id, i) => [id, base + (i < remainder ? 1 : 0)]));
}

/** Göreli ağırlıkları tam sayı yüzdelere çevirir (toplam 100, duraklatılanlar 0). */
export function weightPercents(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total === 0) return Object.fromEntries(entries.map(([id]) => [id, 0]));

  const raw = entries.map(([id, w]) => ({ id, exact: (Math.max(0, w) / total) * 100 }));
  const floored = raw.map((r) => ({ ...r, value: Math.floor(r.exact) }));
  let remainder = 100 - floored.reduce((sum, r) => sum + r.value, 0);
  // En büyük kesir payına sahip olanlara kalanı dağıt.
  [...floored]
    .sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))
    .forEach((r) => {
      if (remainder > 0 && r.exact > 0) {
        r.value += 1;
        remainder -= 1;
      }
    });
  return Object.fromEntries(floored.map((r) => [r.id, r.value]));
}

/**
 * İki tarif arasındaki farkı insan diliyle anlatır. Değişiklik geçmişinde
 * gösterilir: "Hareket: %40 → %30".
 */
export function describeRecipeChanges(prev: Recipe, next: Recipe, pillars: Pillar[]): string[] {
  const changes: string[] = [];
  const prevPct = weightPercents(prev.weights);
  const nextPct = weightPercents(next.weights);

  for (const pillar of pillars) {
    const before = prevPct[pillar.id] ?? 0;
    const after = nextPct[pillar.id] ?? 0;
    if (before !== after) {
      if (after === 0) changes.push(`${pillar.title}: duraklatıldı`);
      else if (before === 0) changes.push(`${pillar.title}: yeniden açıldı (%${after})`);
      else changes.push(`${pillar.title}: %${before} → %${after}`);
    }
  }
  if (prev.budget !== next.budget) changes.push(`Günlük süre: ${prev.budget} → ${next.budget} dk`);
  if (prev.tone !== next.tone) changes.push(`Ton: ${TONE_LABELS[prev.tone]} → ${TONE_LABELS[next.tone]}`);
  if (prev.includeInspire !== next.includeInspire)
    changes.push(`İlham kartı: ${next.includeInspire ? 'açık' : 'kapalı'}`);
  if (prev.includeReflect !== next.includeReflect)
    changes.push(`Yansıt kartı: ${next.includeReflect ? 'açık' : 'kapalı'}`);
  if (prev.doseTime !== next.doseTime) changes.push(`Doz saati: ${prev.doseTime} → ${next.doseTime}`);
  return changes;
}

/** Türkçe kimlik cümlesi: "Ben her gün okuyan ve düzenli hareket eden biriyim." */
export function composeIdentity(phrases: string[]): string {
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return `Ben ${phrases[0]} biriyim.`;
  const head = phrases.slice(0, -1).join(', ');
  return `Ben ${head} ve ${phrases[phrases.length - 1]} biriyim.`;
}
