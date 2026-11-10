import type { Pillar, Recipe, Track, TrackDay } from '../types';

export function makeDay(day: number, overrides: Partial<TrackDay> = {}): TrackDay {
  return {
    day,
    theme: `Tema ${day}`,
    learn: { title: `Öğren ${day}`, body: 'Gövde' },
    do: {
      title: `Uygula ${day}`,
      body: 'Gövde',
      action: `Eylem ${day}`,
      fallback: `Küçük ${day}`,
      minutes: 5,
      suggestedTime: '21:00',
    },
    inspire: { body: `İlham ${day}` },
    reflect: { question: `Soru ${day}?` },
    ...overrides,
  };
}

export function makeTrack(id: string, days = 7): Track {
  return {
    id,
    templateTitle: id,
    pillarTitle: id.toUpperCase(),
    identityPhrase: id,
    description: '',
    whyPlaceholder: '',
    keywords: [],
    levelQuestion: { question: 'Soru?', options: ['A', 'B', 'C'] },
    level: 'baslangic',
    status: 'draft',
    weeks: [1, 2, 3, 4].map((week) => ({ week, theme: `Hafta ${week}` })),
    days: Array.from({ length: days }, (_, i) => makeDay(i + 1)),
  };
}

export function makePillar(id: string, currentDay = 1): Pillar {
  return { id, trackId: id, title: id.toUpperCase(), why: '', level: 'baslangic', currentDay };
}

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    version: 1,
    budget: 10,
    tone: 'nazik',
    weights: {},
    includeInspire: true,
    includeReflect: true,
    doseTime: '07:30',
    ...overrides,
  };
}
