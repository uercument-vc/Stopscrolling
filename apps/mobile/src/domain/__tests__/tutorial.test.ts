import {
  COMPARISON,
  DAY_STEPS,
  EXPECTATION_NOTE,
  EXPECTATIONS,
  FEED_EXAMPLES,
  FIRST_DOSE_FINISH,
  FIRST_DOSE_HINTS,
  OUR_ASK,
  PROMISES,
  TUTORIAL_PAGES,
} from '@/content/tutorial';

import { isFirstDose } from '../metrics';
import type { Dose } from '../types';

const allTutorialText = [
  ...TUTORIAL_PAGES.flatMap((p) => [p.kicker, p.title, ...p.body]),
  ...FEED_EXAMPLES.flatMap((f) => [f.text, f.tag]),
  ...COMPARISON.flatMap((c) => [c.from, c.to]),
  ...DAY_STEPS.flatMap((d) => [d.when, d.what]),
  ...EXPECTATIONS.flatMap((e) => [e.when, e.what]),
  EXPECTATION_NOTE,
  ...PROMISES,
  OUR_ASK,
].join(' ');

describe('tanıtım metni', () => {
  it('5 sayfa: neden, fark, nasıl, beklenti, söz', () => {
    expect(TUTORIAL_PAGES.map((p) => p.id)).toEqual(['akis', 'karsilastirma', 'gun', 'beklenti', 'soz']);
  });

  it('kısa kalıyor: 250 kelimenin altında, yaklaşık 1–1,5 dakikada okunur', () => {
    const words = allTutorialText.split(/\s+/).filter(Boolean).length;
    expect(words).toBeLessThanOrEqual(250);
  });

  it('suçlayıcı ya da abartılı vaat içermiyor', () => {
    const text = allTutorialText.toLocaleLowerCase('tr-TR');
    for (const pattern of [/tembel/, /garanti/, /hayatın değişecek/, /inanırsan başarırsın/, /bahane(n)? yok/]) {
      expect(text).not.toMatch(pattern);
    }
  });

  it('her kart türü için ilk doz ipucu var (tekrar hariç)', () => {
    expect(Object.keys(FIRST_DOSE_HINTS).sort()).toEqual(['ilham', 'ogren', 'uygula', 'yansit']);
    expect(FIRST_DOSE_FINISH).toContain('Bugün nasıl geçti?');
  });
});

describe('isFirstDose', () => {
  const dose = (date: string, status: Dose['status']): Dose => ({
    id: date,
    date,
    recipeVersion: 1,
    cards: [],
    pillarDays: {},
    status,
    currentIndex: 0,
  });

  it('daha önce bitirilmiş doz yoksa ilk dozdur (bugünkü bitmiş olsa bile)', () => {
    expect(isFirstDose([], '2026-11-10')).toBe(true);
    expect(isFirstDose([dose('2026-11-10', 'bitti')], '2026-11-10')).toBe(true);
    expect(isFirstDose([dose('2026-11-09', 'basladi')], '2026-11-10')).toBe(true);
  });

  it('önceki bir gün bitirilmiş doz varsa ilk doz değildir', () => {
    expect(isFirstDose([dose('2026-11-09', 'bitti')], '2026-11-10')).toBe(false);
  });
});
