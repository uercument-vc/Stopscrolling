import type { Action, DateKey } from './types';

/** Raf en fazla 7 öğe tutar: kaydetmek bedava değil. */
export const MAX_SHELF = 7;

/** Rafa koyarken seçilebilecek taahhüt tarihleri (gün sonra). */
export const SHELF_OPTIONS = [
  { days: 1, label: 'Yarın' },
  { days: 3, label: '3 gün sonra' },
  { days: 7, label: '1 hafta sonra' },
] as const;

export const isOpen = (a: Action) => a.status === 'planli' || a.status === 'rafta';
export const isDone = (a: Action) => a.status === 'yapildi' || a.status === 'kismen';

export function shelfItems(actions: Action[]): Action[] {
  return actions.filter((a) => a.status === 'rafta');
}

export function canShelve(actions: Action[]): boolean {
  return shelfItems(actions).length < MAX_SHELF;
}

/** Bugün yapılacaklar: bugüne planlananlar + tarihi gelen raf öğeleri. */
export function todayActions(actions: Action[], today: DateKey): Action[] {
  return actions
    .filter(
      (a) =>
        (a.status === 'planli' && a.plannedFor === today) ||
        (a.status === 'rafta' && a.plannedFor <= today),
    )
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}

/** Geçmiş günlerden kalan, sonucu girilmemiş planlı eylemler. */
export function pendingActions(actions: Action[], today: DateKey): Action[] {
  return actions.filter((a) => a.status === 'planli' && a.plannedFor < today);
}

/** Rafta bekleyen, tarihi henüz gelmemiş öğeler. */
export function upcomingShelf(actions: Action[], today: DateKey): Action[] {
  return actions
    .filter((a) => a.status === 'rafta' && a.plannedFor > today)
    .sort((a, b) => a.plannedFor.localeCompare(b.plannedFor));
}

/** Son tamamlananlar, en yeniden eskiye. */
export function completedActions(actions: Action[], limit = 20): Action[] {
  return actions
    .filter(isDone)
    .sort((a, b) => (b.resolvedOn ?? '').localeCompare(a.resolvedOn ?? ''))
    .slice(0, limit);
}
