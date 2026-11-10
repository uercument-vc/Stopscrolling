import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TRACKS } from '@/content/library';
import { canShelve } from '@/domain/actions';
import { addDays } from '@/domain/dates';
import { advancePillars, buildDose, countShown } from '@/domain/dose-builder';
import { describeRecipeChanges, equalWeights } from '@/domain/recipe';
import type {
  Action,
  ActionStatus,
  DateKey,
  Dose,
  DoseCard,
  Feedback,
  OnboardingInput,
  Pillar,
  Profile,
  Recipe,
  RecipeChange,
  TimeOfDay,
} from '@/domain/types';
import { notifications } from '@/services/notifications';

/**
 * Uygulamanın tüm yerel durumu. Şimdilik cihazda (AsyncStorage) tutulur;
 * Supabase bağlandığında aynı şekil sunucuyla eşitlenecek.
 */
export interface AppState {
  onboarded: boolean;
  identity: string;
  /** Kullanıcının kurulumda kendini anlattığı bilgiler. */
  profile: Profile;
  pillars: Pillar[];
  recipe: Recipe;
  recipeHistory: RecipeChange[];
  doses: Record<DateKey, Dose>;
  actions: Action[];
  dismissedSuggestions: string[];
  /** Sadece geliştirme: Döngüyü birkaç gün boyunca denemek için takvimi ileri sarar. */
  devDayOffset: number;

  completeOnboarding: (input: OnboardingInput, today: DateKey) => void;
  setIdentity: (identity: string) => void;
  /** Bugünün dozu yoksa kurar. Henüz başlanmamış doz tarif değiştiyse yeniden kurulur. */
  ensureDose: (today: DateKey) => void;
  setDoseIndex: (date: DateKey, index: number) => void;
  setFeedback: (date: DateKey, cardId: string, feedback: Feedback | undefined) => void;
  setAnswer: (date: DateKey, cardId: string, answer: string) => void;
  planAction: (date: DateKey, cardId: string, opts: { time?: TimeOfDay; small: boolean }) => void;
  /** Raf doluysa false döner. */
  shelveAction: (date: DateKey, cardId: string, days: number) => boolean;
  skipAction: (date: DateKey, cardId: string) => void;
  finishDose: (date: DateKey) => void;
  resolveAction: (actionId: string, status: Extract<ActionStatus, 'yapildi' | 'kismen' | 'yapilmadi' | 'birakildi'>, today: DateKey) => void;
  moveToToday: (actionId: string, today: DateKey) => void;
  updateRecipe: (next: Omit<Recipe, 'version'>, by: RecipeChange['by'], today: DateKey) => void;
  rollbackRecipe: (version: number, today: DateKey) => void;
  dismissSuggestion: (id: string) => void;
  shiftDevDay: (days: number) => void;
  resetAll: () => void;
}

const DEFAULT_RECIPE: Recipe = {
  version: 1,
  budget: 10,
  tone: 'nazik',
  weights: {},
  includeInspire: true,
  includeReflect: true,
  doseTime: '07:30',
};

const EMPTY_PROFILE: Profile = {
  timeSinks: [],
  productiveTime: 'sabah',
  baselineSocialHours: '',
  selfDescription: '',
  desiredTraits: [],
  futureDay: '',
};

const initialData = {
  onboarded: false,
  identity: '',
  profile: EMPTY_PROFILE,
  pillars: [] as Pillar[],
  recipe: DEFAULT_RECIPE,
  recipeHistory: [] as RecipeChange[],
  doses: {} as Record<DateKey, Dose>,
  actions: [] as Action[],
  dismissedSuggestions: [] as string[],
  devDayOffset: 0,
};

function updateCard(dose: Dose, cardId: string, patch: Partial<DoseCard>): Dose {
  return { ...dose, cards: dose.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) };
}

function newAction(card: DoseCard, today: DateKey, patch: Partial<Action>): Action {
  const action = card.action!;
  return {
    id: `${card.id}:${Date.now()}`,
    cardId: card.id,
    pillarId: card.pillarId,
    title: action.title,
    fallback: action.fallback,
    minutes: action.minutes,
    plannedFor: today,
    small: false,
    status: 'planli',
    createdOn: today,
    ...patch,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      completeOnboarding: (input, today) => {
        const pillars: Pillar[] = input.pillars.map((p) => ({
          id: p.trackId,
          trackId: p.trackId,
          title: TRACKS[p.trackId].pillarTitle,
          why: p.why.trim(),
          level: p.level,
          motivatedBy: p.motivatedBy,
          currentDay: 1,
        }));
        const recipe: Recipe = {
          ...DEFAULT_RECIPE,
          budget: input.budget,
          tone: input.tone,
          doseTime: input.doseTime,
          weights: equalWeights(pillars.map((p) => p.id)),
        };
        set({
          ...initialData,
          onboarded: true,
          identity: input.identity.trim(),
          profile: {
            ...input.profile,
            selfDescription: input.profile.selfDescription.trim(),
            futureDay: input.profile.futureDay.trim(),
          },
          pillars,
          recipe,
          recipeHistory: [
            { version: 1, date: today, changes: ['İlk tarif oluşturuldu'], by: 'kullanici', snapshot: recipe },
          ],
        });
        get().ensureDose(today);
        void notifications.scheduleDailyDose(recipe.doseTime);
      },

      setIdentity: (identity) => set({ identity }),

      ensureDose: (today) => {
        const { doses, pillars, recipe } = get();
        const existing = doses[today];
        const stale = existing && existing.status === 'hazir' && existing.recipeVersion !== recipe.version;
        if (existing && !stale) return;

        const history = Object.values(doses).filter((d) => d.date !== today && d.status === 'bitti');
        const dose = buildDose({
          date: today,
          pillars,
          recipe,
          tracks: TRACKS,
          shownCounts: countShown(history),
        });
        set({ doses: { ...doses, [today]: dose } });
      },

      setDoseIndex: (date, index) => {
        const dose = get().doses[date];
        if (!dose) return;
        set({
          doses: {
            ...get().doses,
            [date]: { ...dose, currentIndex: index, status: dose.status === 'bitti' ? 'bitti' : 'basladi' },
          },
        });
      },

      setFeedback: (date, cardId, feedback) => {
        const dose = get().doses[date];
        if (!dose) return;
        set({ doses: { ...get().doses, [date]: updateCard(dose, cardId, { feedback }) } });
      },

      setAnswer: (date, cardId, answer) => {
        const dose = get().doses[date];
        if (!dose) return;
        set({ doses: { ...get().doses, [date]: updateCard(dose, cardId, { answer }) } });
      },

      planAction: (date, cardId, { time, small }) => {
        const { doses, actions } = get();
        const dose = doses[date];
        const card = dose?.cards.find((c) => c.id === cardId);
        if (!dose || !card?.action) return;
        const others = actions.filter((a) => a.cardId !== cardId);
        // Günde en fazla 2 bildirim: doz hatırlatması + en fazla 1 eylem hatırlatması.
        const reminder =
          !!time && !others.some((a) => a.plannedFor === date && a.status === 'planli' && a.reminder);
        const action = newAction(card, date, {
          time,
          small,
          reminder,
          title: small ? card.action.fallback : card.action.title,
        });
        set({
          actions: [...others, action],
          doses: { ...doses, [date]: updateCard(dose, cardId, { decision: small ? 'kucuk' : 'planlandi' }) },
        });
        if (reminder) void notifications.scheduleAction(action);
      },

      shelveAction: (date, cardId, days) => {
        const { doses, actions } = get();
        const dose = doses[date];
        const card = dose?.cards.find((c) => c.id === cardId);
        const others = actions.filter((a) => a.cardId !== cardId);
        if (!dose || !card?.action || !canShelve(others)) return false;
        const action = newAction(card, date, { status: 'rafta', plannedFor: addDays(date, days) });
        set({
          actions: [...others, action],
          doses: { ...doses, [date]: updateCard(dose, cardId, { decision: 'rafa' }) },
        });
        return true;
      },

      skipAction: (date, cardId) => {
        const { doses, actions } = get();
        const dose = doses[date];
        if (!dose) return;
        set({
          actions: actions.filter((a) => a.cardId !== cardId),
          doses: { ...doses, [date]: updateCard(dose, cardId, { decision: 'gecildi' }) },
        });
      },

      finishDose: (date) => {
        const { doses, pillars } = get();
        const dose = doses[date];
        if (!dose || dose.status === 'bitti') return;
        set({
          doses: { ...doses, [date]: { ...dose, status: 'bitti', finishedAt: new Date().toISOString() } },
          pillars: advancePillars(pillars, dose),
        });
      },

      resolveAction: (actionId, status, today) => {
        set({
          actions: get().actions.map((a) => (a.id === actionId ? { ...a, status, resolvedOn: today } : a)),
        });
        void notifications.cancelAction(actionId);
      },

      moveToToday: (actionId, today) => {
        set({
          actions: get().actions.map((a) =>
            a.id === actionId ? { ...a, status: 'planli', plannedFor: today } : a,
          ),
        });
      },

      updateRecipe: (next, by, today) => {
        const { recipe, pillars, recipeHistory } = get();
        const changes = describeRecipeChanges(recipe, { ...next, version: recipe.version }, pillars);
        if (changes.length === 0) return;
        const updated: Recipe = { ...next, version: recipe.version + 1 };
        set({
          recipe: updated,
          recipeHistory: [
            ...recipeHistory,
            { version: updated.version, date: today, changes, by, snapshot: updated },
          ],
        });
        if (next.doseTime !== recipe.doseTime) void notifications.scheduleDailyDose(next.doseTime);
        get().ensureDose(today);
      },

      rollbackRecipe: (version, today) => {
        const entry = get().recipeHistory.find((h) => h.version === version);
        if (!entry) return;
        const { version: _ignored, ...rest } = entry.snapshot;
        get().updateRecipe(rest, 'kullanici', today);
      },

      dismissSuggestion: (id) => set({ dismissedSuggestions: [...get().dismissedSuggestions, id] }),

      shiftDevDay: (days) => set({ devDayOffset: get().devDayOffset + days }),

      resetAll: () => {
        set({ ...initialData });
        void notifications.cancelAll();
      },
    }),
    {
      name: 'stopscrolling-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // v2: Kurulum profili eklendi; eski "baselineSocialHours" profile taşındı.
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          state.profile = { ...EMPTY_PROFILE, baselineSocialHours: (state.baselineSocialHours as string) ?? '' };
          delete state.baselineSocialHours;
        }
        return state as unknown as AppState;
      },
      partialize: (s) => ({
        onboarded: s.onboarded,
        identity: s.identity,
        profile: s.profile,
        pillars: s.pillars,
        recipe: s.recipe,
        recipeHistory: s.recipeHistory,
        doses: s.doses,
        actions: s.actions,
        dismissedSuggestions: s.dismissedSuggestions,
        devDayOffset: s.devDayOffset,
      }),
    },
  ),
);
