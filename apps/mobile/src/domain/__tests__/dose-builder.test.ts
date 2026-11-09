import { advancePillars, buildDose, countShown, estimateMinutes, selectPillars } from '../dose-builder';
import { makePillar, makeRecipe, makeTrack } from './fixtures';

const tracks = { a: makeTrack('a'), b: makeTrack('b'), c: makeTrack('c') };

describe('selectPillars', () => {
  it('bütçe yetiyorsa tüm aktif sütunları ağırlık sırasıyla seçer', () => {
    const pillars = [makePillar('a'), makePillar('b')];
    const selected = selectPillars(pillars, { a: 40, b: 60 }, 2, {});
    expect(selected.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('duraklatılmış (ağırlığı 0) sütunu hiç seçmez', () => {
    const pillars = [makePillar('a'), makePillar('b')];
    expect(selectPillars(pillars, { a: 0, b: 50 }, 2, {}).map((p) => p.id)).toEqual(['b']);
  });

  it('tek slotta zaman içinde ağırlıkla orantılı gösterim yapar (60/40 → 6/4)', () => {
    const pillars = [makePillar('a'), makePillar('b')];
    const shown: Record<string, number> = {};
    for (let day = 0; day < 10; day++) {
      const [pick] = selectPillars(pillars, { a: 60, b: 40 }, 1, shown);
      shown[pick.id] = (shown[pick.id] ?? 0) + 1;
    }
    expect(shown).toEqual({ a: 6, b: 4 });
  });

  it('eşit ağırlıkta 3 sütun ve 2 slotla adil döner', () => {
    const pillars = [makePillar('a'), makePillar('b'), makePillar('c')];
    const shown: Record<string, number> = {};
    for (let day = 0; day < 6; day++) {
      for (const p of selectPillars(pillars, { a: 1, b: 1, c: 1 }, 2, shown)) {
        shown[p.id] = (shown[p.id] ?? 0) + 1;
      }
    }
    expect(shown).toEqual({ a: 4, b: 4, c: 4 });
  });
});

describe('buildDose', () => {
  it('her öğren kartını bir uygula kartıyla eşler, en fazla 1 ilham ve 1 yansıt ekler', () => {
    const dose = buildDose({
      date: '2026-11-09',
      pillars: [makePillar('a'), makePillar('b')],
      recipe: makeRecipe({ weights: { a: 50, b: 50 } }),
      tracks,
      shownCounts: {},
    });
    expect(dose.cards.map((c) => c.type)).toEqual(['ogren', 'uygula', 'ogren', 'uygula', 'ilham', 'yansit']);
    expect(dose.pillarDays).toEqual({ a: 1, b: 1 });
    expect(dose.status).toBe('hazir');
    const ids = dose.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('5 dakikalık bütçede tek sütun seçer ve nedenini açıklar', () => {
    const dose = buildDose({
      date: '2026-11-09',
      pillars: [makePillar('a'), makePillar('b')],
      recipe: makeRecipe({ budget: 5, weights: { a: 70, b: 30 } }),
      tracks,
      shownCounts: {},
    });
    expect(new Set(dose.cards.map((c) => c.pillarId))).toEqual(new Set(['a']));
    expect(dose.cards[0].why).toContain('%70');
    expect(dose.cards[0].why).toContain('bugün 1 sütuna yer var');
  });

  it('ilham ve yansıt kapalıysa sadece öğren/uygula kartları gelir', () => {
    const dose = buildDose({
      date: '2026-11-09',
      pillars: [makePillar('a')],
      recipe: makeRecipe({ weights: { a: 1 }, includeInspire: false, includeReflect: false }),
      tracks,
      shownCounts: {},
    });
    expect(dose.cards.map((c) => c.type)).toEqual(['ogren', 'uygula']);
  });

  it('kullanıcının kaldığı yol gününü gösterir', () => {
    const dose = buildDose({
      date: '2026-11-09',
      pillars: [makePillar('a', 4)],
      recipe: makeRecipe({ weights: { a: 1 } }),
      tracks,
      shownCounts: {},
    });
    expect(dose.cards[0].title).toBe('Öğren 4');
    expect(dose.cards[0].why).toContain('1. hafta, 4. gün');
    expect(dose.cards[1].action?.title).toBe('Eylem 4');
  });

  it('yazılmış içerik bitince yeni bilgi yerine tekrar kartı verir ve günü ilerletmez', () => {
    const pillars = [makePillar('a', 8)];
    const dose = buildDose({
      date: '2026-11-09',
      pillars,
      recipe: makeRecipe({ weights: { a: 1 } }),
      tracks,
      shownCounts: {},
    });
    expect(dose.cards.map((c) => c.type)).toEqual(['tekrar']);
    expect(dose.cards[0].action).toBeDefined();
    expect(advancePillars(pillars, dose)[0].currentDay).toBe(8);
  });
});

describe('advancePillars / countShown / estimateMinutes', () => {
  it('sadece dozda yer alan sütunları bir gün ilerletir', () => {
    const pillars = [makePillar('a', 2), makePillar('b', 5)];
    const dose = buildDose({
      date: '2026-11-09',
      pillars,
      recipe: makeRecipe({ budget: 5, weights: { a: 90, b: 10 } }),
      tracks,
      shownCounts: {},
    });
    expect(advancePillars(pillars, dose).map((p) => p.currentDay)).toEqual([3, 5]);
  });

  it('her sütunun kaç dozda gösterildiğini sayar', () => {
    const recipe = makeRecipe({ weights: { a: 1, b: 1 } });
    const d1 = buildDose({ date: '2026-11-09', pillars: [makePillar('a'), makePillar('b')], recipe, tracks, shownCounts: {} });
    const d2 = buildDose({ date: '2026-11-10', pillars: [makePillar('a')], recipe, tracks, shownCounts: {} });
    expect(countShown([d1, d2])).toEqual({ a: 2, b: 1 });
  });

  it('10 dakikalık bütçede tahmini süre 10 dakikayı aşmaz', () => {
    const dose = buildDose({
      date: '2026-11-09',
      pillars: [makePillar('a'), makePillar('b')],
      recipe: makeRecipe({ weights: { a: 1, b: 1 } }),
      tracks,
      shownCounts: {},
    });
    expect(estimateMinutes(dose.cards)).toBeLessThanOrEqual(10);
  });
});
