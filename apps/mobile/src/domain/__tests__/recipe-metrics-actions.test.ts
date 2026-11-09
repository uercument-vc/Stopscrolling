import { canShelve, MAX_SHELF, pendingActions, todayActions, upcomingShelf } from '../actions';
import { addDays, formatLongDate, startOfWeek } from '../dates';
import { buildDose } from '../dose-builder';
import { summarizeWeek, weeklySuggestion } from '../metrics';
import { timeWithLocative, toTurkishUpper } from '../turkce';
import { composeIdentity, describeRecipeChanges, equalWeights, weightPercents } from '../recipe';
import type { Action, ActionStatus, Dose } from '../types';
import { makePillar, makeRecipe, makeTrack } from './fixtures';

function action(overrides: Partial<Action> & { status: ActionStatus }): Action {
  return {
    id: Math.random().toString(36).slice(2),
    cardId: 'k',
    pillarId: 'a',
    title: 'Eylem',
    fallback: 'Küçük',
    minutes: 5,
    plannedFor: '2026-11-09',
    small: false,
    createdOn: '2026-11-09',
    ...overrides,
  };
}

describe('recipe', () => {
  it('eşit ağırlıkları toplam 100 olacak şekilde dağıtır', () => {
    expect(equalWeights(['a', 'b', 'c'])).toEqual({ a: 34, b: 33, c: 33 });
  });

  it('göreli ağırlıkları tam sayı yüzdelere çevirir, toplam her zaman 100', () => {
    const pct = weightPercents({ a: 10, b: 10, c: 10 });
    expect(Object.values(pct).reduce((s, v) => s + v, 0)).toBe(100);
    expect(weightPercents({ a: 30, b: 0 })).toEqual({ a: 100, b: 0 });
  });

  it('tarif farkını insan diliyle anlatır', () => {
    const pillars = [makePillar('a'), makePillar('b')];
    const prev = makeRecipe({ weights: { a: 60, b: 40 } });
    const next = makeRecipe({ weights: { a: 60, b: 0 }, budget: 15, tone: 'sert' });
    expect(describeRecipeChanges(prev, next, pillars)).toEqual([
      'A: %60 → %100',
      'B: duraklatıldı',
      'Günlük süre: 10 → 15 dk',
      'Ton: Nazik arkadaş → Sert antrenör',
    ]);
    expect(describeRecipeChanges(prev, prev, pillars)).toEqual([]);
  });

  it('Türkçe kimlik cümlesi kurar', () => {
    expect(composeIdentity(['her gün okuyan'])).toBe('Ben her gün okuyan biriyim.');
    expect(composeIdentity(['her gün okuyan', 'dikkatini koruyan', 'her gün kod yazan'])).toBe(
      'Ben her gün okuyan, dikkatini koruyan ve her gün kod yazan biriyim.',
    );
  });
});

describe('dates', () => {
  it('haftayı pazartesiden başlatır', () => {
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09'); // Pazartesi
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09'); // Pazar
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('tarihi Türkçe biçimlendirir', () => {
    expect(formatLongDate('2026-11-09')).toBe('9 Kasım Pazartesi');
  });
});

describe('actions (raf ve bugün)', () => {
  it('raf en fazla 7 öğe alır', () => {
    const shelf = Array.from({ length: MAX_SHELF }, () => action({ status: 'rafta', plannedFor: '2026-11-12' }));
    expect(canShelve(shelf.slice(1))).toBe(true);
    expect(canShelve(shelf)).toBe(false);
  });

  it('tarihi gelen raf öğesi bugün listesine düşer, gelmeyen rafta kalır', () => {
    const due = action({ status: 'rafta', plannedFor: '2026-11-09' });
    const later = action({ status: 'rafta', plannedFor: '2026-11-12' });
    const planned = action({ status: 'planli', plannedFor: '2026-11-09', time: '08:00' });
    expect(todayActions([due, later, planned], '2026-11-09')).toEqual([planned, due]);
    expect(upcomingShelf([due, later, planned], '2026-11-09')).toEqual([later]);
  });

  it('geçmiş günden kalan planlı eylemleri bekleyen olarak gösterir', () => {
    const old = action({ status: 'planli', plannedFor: '2026-11-08' });
    const done = action({ status: 'yapildi', plannedFor: '2026-11-08' });
    expect(pendingActions([old, done], '2026-11-09')).toEqual([old]);
  });
});

describe('metrics (anlamlı gün ve haftalık ayar)', () => {
  const tracks = { a: makeTrack('a'), b: makeTrack('b') };
  const pillars = [makePillar('a'), makePillar('b')];
  const recipe = makeRecipe({ weights: { a: 50, b: 50 } });

  function finishedDose(date: string): Dose {
    return { ...buildDose({ date, pillars, recipe, tracks, shownCounts: {} }), status: 'bitti' };
  }

  it('anlamlı gün = doz bitti VE en az bir eylem yapıldı', () => {
    const doses = [finishedDose('2026-11-09'), finishedDose('2026-11-10')];
    const actions = [action({ status: 'yapildi', resolvedOn: '2026-11-09' })];
    const week = summarizeWeek('2026-11-11', doses, actions, pillars);
    expect(week.doseDays).toBe(2);
    expect(week.meaningfulDays).toBe(1);
    expect(week.days[0]).toMatchObject({ date: '2026-11-09', meaningful: true });
    expect(week.days[1]).toMatchObject({ date: '2026-11-10', doseFinished: true, meaningful: false });
  });

  it('eylemleri sürekli yapılmayan sütun için ağırlık azaltma önerir; onaylanınca uygulanır', () => {
    const actions = [
      action({ pillarId: 'b', status: 'yapilmadi', plannedFor: '2026-11-09' }),
      action({ pillarId: 'b', status: 'yapilmadi', plannedFor: '2026-11-10' }),
      action({ pillarId: 'b', status: 'planli', plannedFor: '2026-11-11' }),
    ];
    const week = summarizeWeek('2026-11-11', [], actions, pillars);
    const suggestion = weeklySuggestion(week, recipe, pillars, []);
    expect(suggestion?.id).toBe('2026-11-09:agirlik-azalt:b');
    expect(suggestion?.apply(recipe).weights).toEqual({ a: 50, b: 40 });
    expect(weeklySuggestion(week, recipe, pillars, [suggestion!.id])).toBeNull();
  });

  it('ritim iyiyse günlük süreyi artırmayı önerir', () => {
    const doses = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'].map(finishedDose);
    const week = summarizeWeek('2026-11-13', doses, [], pillars);
    const suggestion = weeklySuggestion(week, recipe, pillars, []);
    expect(suggestion?.apply(recipe).budget).toBe(15);
  });
});

describe('Türkçe metin kuralları', () => {
  it('saate doğru bulunma ekini ekler', () => {
    expect(timeWithLocative('21:30')).toBe("21:30'da");
    expect(timeWithLocative('20:00')).toBe("20:00'de");
    expect(timeWithLocative('13:00')).toBe("13:00'te");
    expect(timeWithLocative('09:00')).toBe("09:00'da");
    expect(timeWithLocative('10:00')).toBe("10:00'da");
    expect(timeWithLocative('21:45')).toBe("21:45'te");
    expect(timeWithLocative('07:40')).toBe("07:40'ta");
    expect(timeWithLocative('16:00')).toBe("16:00'da");
    expect(timeWithLocative('00:00')).toBe("00:00'da");
  });

  it('i/ı harflerini Türkçe kurala göre büyütür', () => {
    expect(toTurkishUpper('9 Kasım Pazartesi')).toBe('9 KASIM PAZARTESİ');
    expect(toTurkishUpper('Bugün nasıl geçti?')).toBe('BUGÜN NASIL GEÇTİ?');
  });
});
