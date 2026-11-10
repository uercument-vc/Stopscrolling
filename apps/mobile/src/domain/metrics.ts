import { isDone } from './actions';
import { startOfWeek, weekDays } from './dates';
import type { Action, DateKey, Dose, Pillar, Recipe } from './types';

/** Haftalık hedef: 7 günün 4'ünde dozu bitirmek. Esnek ve affedici. */
export const WEEKLY_DOSE_TARGET = 4;

export interface DaySummary {
  date: DateKey;
  doseFinished: boolean;
  actionsDone: number;
  /** Anlamlı gün: doz bitti VE en az bir eylem yapıldı. North Star metriğinin birimi. */
  meaningful: boolean;
}

export interface WeekSummary {
  weekStart: DateKey;
  days: DaySummary[];
  doseDays: number;
  meaningfulDays: number;
  actionsDone: number;
  perPillar: Record<string, { planned: number; done: number }>;
}

export function summarizeWeek(
  today: DateKey,
  doses: Dose[],
  actions: Action[],
  pillars: Pillar[],
): WeekSummary {
  const days = weekDays(today).map((date): DaySummary => {
    const doseFinished = doses.some((d) => d.date === date && d.status === 'bitti');
    const actionsDone = actions.filter((a) => isDone(a) && a.resolvedOn === date).length;
    return { date, doseFinished, actionsDone, meaningful: doseFinished && actionsDone > 0 };
  });

  const inWeek = new Set(days.map((d) => d.date));
  const perPillar: WeekSummary['perPillar'] = Object.fromEntries(
    pillars.map((p) => [p.id, { planned: 0, done: 0 }]),
  );
  for (const a of actions) {
    if (!inWeek.has(a.plannedFor) || !perPillar[a.pillarId]) continue;
    if (a.status === 'rafta' || a.status === 'birakildi') continue;
    perPillar[a.pillarId].planned += 1;
    if (isDone(a)) perPillar[a.pillarId].done += 1;
  }

  return {
    weekStart: startOfWeek(today),
    days,
    doseDays: days.filter((d) => d.doseFinished).length,
    meaningfulDays: days.filter((d) => d.meaningful).length,
    actionsDone: days.reduce((sum, d) => sum + d.actionsDone, 0),
    perPillar,
  };
}

export interface Suggestion {
  /** Haftaya özgü kimlik: reddedilen öneri aynı hafta tekrar gösterilmez. */
  id: string;
  text: string;
  apply: (recipe: Recipe) => Recipe;
}

/**
 * Haftalık Ayar önerisi (öner–onayla modeli). Sistem tarifi kendi başına
 * değiştirmez; öneri sunar, kullanıcı onaylarsa uygulanır.
 *
 * Şimdilik kural tabanlı. Kişiselleştirme servisi bağlandığında aynı arayüzle
 * AI önerileri gelecek.
 */
export function weeklySuggestion(
  summary: WeekSummary,
  recipe: Recipe,
  pillars: Pillar[],
  dismissed: string[],
): Suggestion | null {
  const candidates: Suggestion[] = [];
  const active = pillars.filter((p) => (recipe.weights[p.id] ?? 0) > 0);

  // 1) Bir sütunun eylemleri sürekli yapılmıyorsa ağırlığını azaltmayı öner.
  if (active.length > 1) {
    for (const p of active) {
      const stats = summary.perPillar[p.id];
      if (!stats || stats.planned < 3 || stats.done / stats.planned >= 1 / 3) continue;
      const current = recipe.weights[p.id];
      const next = Math.max(10, current - 10);
      if (next === current) continue;
      candidates.push({
        id: `${summary.weekStart}:agirlik-azalt:${p.id}`,
        text: `Bu hafta ${p.title} eylemlerinin ${stats.planned} tanesinden ${stats.done} tanesini yaptın. Bu sütunun ağırlığını biraz azaltalım mı? Küçük versiyonları seçmek de bir seçenek.`,
        apply: (r) => ({ ...r, weights: { ...r.weights, [p.id]: next } }),
      });
    }
  }

  // 2) Ritim çok iyiyse süreyi artırmayı öner.
  if (summary.doseDays >= 5 && recipe.budget < 15) {
    const next = recipe.budget === 5 ? 10 : 15;
    candidates.push({
      id: `${summary.weekStart}:sure-artir`,
      text: `Bu hafta ${summary.doseDays} gün dozunu bitirdin. Günlük süreyi ${recipe.budget} dakikadan ${next} dakikaya çıkarmak ister misin?`,
      apply: (r) => ({ ...r, budget: next }),
    });
  }

  return candidates.find((c) => !dismissed.includes(c.id)) ?? null;
}

/**
 * Kullanıcının ilk dozu mu? (Bugünden önce bitirilmiş doz yok.)
 * İlk doz ipuçları ve ilk bitiş mesajı sadece bu durumda gösterilir.
 */
export function isFirstDose(doses: Dose[], today: DateKey): boolean {
  return !doses.some((d) => d.date !== today && d.status === 'bitti');
}
