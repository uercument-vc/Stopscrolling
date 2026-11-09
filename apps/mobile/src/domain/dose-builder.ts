import { slotsForBudget, weightPercents } from './recipe';
import type { DateKey, Dose, DoseCard, Pillar, Recipe, Track } from './types';

/**
 * Dozda hangi sütunların yer alacağını seçer.
 *
 * Bütçe tüm sütunlara yetiyorsa hepsi seçilir. Yetmiyorsa her sütunun
 * "hak ettiği" gösterim sayısı (ağırlık payı × toplam gösterim) ile şimdiye
 * kadar gösterilme sayısı karşılaştırılır; en çok geride kalan seçilir.
 * Böylece %60 / %40 ağırlık, zaman içinde 6'ya 4 gösterime dönüşür.
 *
 * Sadece açık sinyaller kullanılır: ağırlık (kullanıcı belirler) ve geçmiş
 * gösterim sayısı. Ekranda kalma süresi gibi dikkat sinyalleri yoktur.
 */
export function selectPillars(
  pillars: Pillar[],
  weights: Record<string, number>,
  slots: number,
  shownCounts: Record<string, number>,
): Pillar[] {
  const active = pillars.filter((p) => (weights[p.id] ?? 0) > 0);
  const byWeight = (a: Pillar, b: Pillar) =>
    (weights[b.id] ?? 0) - (weights[a.id] ?? 0) || a.id.localeCompare(b.id);

  if (active.length <= slots) return [...active].sort(byWeight);

  const totalWeight = active.reduce((sum, p) => sum + weights[p.id], 0);
  const totalShown = active.reduce((sum, p) => sum + (shownCounts[p.id] ?? 0), 0);
  const score = (p: Pillar) =>
    (weights[p.id] / totalWeight) * (totalShown + slots) - (shownCounts[p.id] ?? 0);

  return [...active]
    .sort((a, b) => score(b) - score(a) || byWeight(a, b))
    .slice(0, slots)
    .sort(byWeight);
}

export interface BuildDoseInput {
  date: DateKey;
  pillars: Pillar[];
  recipe: Recipe;
  tracks: Record<string, Track>;
  /** Her sütunun daha önce kaç dozda yer aldığı. */
  shownCounts: Record<string, number>;
}

const CARD_MINUTES: Record<DoseCard['type'], number> = {
  ogren: 2,
  uygula: 1,
  tekrar: 2,
  ilham: 1,
  yansit: 1,
};

export function estimateMinutes(cards: DoseCard[]): number {
  return cards.reduce((sum, c) => sum + CARD_MINUTES[c.type], 0);
}

function trackPosition(day: number) {
  return { week: Math.ceil(day / 7), dayInWeek: ((day - 1) % 7) + 1 };
}

/**
 * Günün dozunu yol kütüphanesinden kurar. Saf fonksiyondur: aynı girdi her
 * zaman aynı dozu üretir. Kişiselleştirme servisi (Supabase + Claude) bağlandığında
 * bu doz "temel doz" olarak kullanılır ve metinleri kullanıcıya göre uyarlanır.
 */
export function buildDose({ date, pillars, recipe, tracks, shownCounts }: BuildDoseInput): Dose {
  const slots = slotsForBudget(recipe.budget);
  const percents = weightPercents(recipe.weights);
  const activeCount = pillars.filter((p) => (recipe.weights[p.id] ?? 0) > 0).length;
  const selected = selectPillars(pillars, recipe.weights, slots, shownCounts).filter(
    (p) => tracks[p.trackId],
  );

  const selectionNote =
    activeCount > slots
      ? ` · Günlük süren ${recipe.budget} dk, bugün ${slots} sütuna yer var; ağırlığına göre sıra bu sütundaydı.`
      : '';

  const cards: DoseCard[] = [];
  const pillarDays: Record<string, number> = {};
  const id = (pillarId: string, type: string) => `${date}:${pillarId}:${type}`;

  for (const pillar of selected) {
    const track = tracks[pillar.trackId];
    const trackDay = track.days.find((d) => d.day === pillar.currentDay);

    if (!trackDay) {
      // Yazılmış içerik bitti: yeni bilgi yerine tekrar günü.
      const last = track.days[track.days.length - 1];
      cards.push({
        id: id(pillar.id, 'tekrar'),
        type: 'tekrar',
        pillarId: pillar.id,
        title: 'Tekrar günü',
        body: `${track.pillarTitle} yolunun hazır olan ilk ${track.days.length} gününü bitirdin. Bugün yeni bir bilgi yok: Tekrar, alışkanlığı kalıcı yapan şeydir. Bu yolda en çok işine yarayan eylemi seç ve bir kez daha yap.`,
        trackRef: { trackId: track.id, day: pillar.currentDay },
        why: `${track.pillarTitle} sütunun (%${percents[pillar.id]}) · Sonraki haftaların içeriği hazırlanıyor${selectionNote}`,
        action: {
          title: 'Bu yolda en çok işine yarayan eylemi bir kez daha yap',
          fallback: 'Hangisi olduğunu tek cümleyle yaz',
          minutes: 10,
          suggestedTime: last?.do.suggestedTime ?? '20:00',
        },
      });
      continue;
    }

    pillarDays[pillar.id] = trackDay.day;
    const { week, dayInWeek } = trackPosition(trackDay.day);
    const ref = { trackId: track.id, day: trackDay.day };

    cards.push({
      id: id(pillar.id, 'ogren'),
      type: 'ogren',
      pillarId: pillar.id,
      title: trackDay.learn.title,
      body: trackDay.learn.body,
      source: trackDay.learn.source,
      trackRef: ref,
      why: `${track.pillarTitle} sütunun (%${percents[pillar.id]}) · Yol: ${week}. hafta, ${dayInWeek}. gün, "${trackDay.theme}"${selectionNote}`,
    });
    cards.push({
      id: id(pillar.id, 'uygula'),
      type: 'uygula',
      pillarId: pillar.id,
      title: trackDay.do.title,
      body: trackDay.do.body,
      trackRef: ref,
      why: `"${trackDay.learn.title}" kartının uygulaması. Her öğren kartı bir eyleme bağlanır; bilgi tek başına sunulmaz.`,
      action: {
        title: trackDay.do.action,
        fallback: trackDay.do.fallback,
        minutes: trackDay.do.minutes,
        suggestedTime: trackDay.do.suggestedTime,
      },
    });
  }

  const shown = selected.filter((p) => pillarDays[p.id] !== undefined);

  if (recipe.includeInspire) {
    const source = shown.find((p) => tracks[p.trackId].days.find((d) => d.day === pillarDays[p.id])?.inspire);
    if (source) {
      const track = tracks[source.trackId];
      const inspire = track.days.find((d) => d.day === pillarDays[source.id])!.inspire!;
      cards.push({
        id: id(source.id, 'ilham'),
        type: 'ilham',
        pillarId: source.id,
        body: inspire.body,
        source: inspire.source,
        trackRef: { trackId: track.id, day: pillarDays[source.id] },
        why: `Tarifinde İlham kartı açık · ${track.pillarTitle} yolundan. İlham kartları sonucu değil süreci anlatır.`,
      });
    }
  }

  if (recipe.includeReflect && shown.length > 0) {
    const pick = shown[Number(date.replaceAll('-', '')) % shown.length];
    const track = tracks[pick.trackId];
    const day = track.days.find((d) => d.day === pillarDays[pick.id])!;
    cards.push({
      id: id(pick.id, 'yansit'),
      type: 'yansit',
      pillarId: pick.id,
      body: day.reflect.question,
      trackRef: { trackId: track.id, day: day.day },
      why: 'Tarifinde Yansıt kartı açık · Cevapların sadece senin içindir ve sonraki dozları kişiselleştirmek için kullanılır.',
    });
  }

  return {
    id: `dose:${date}`,
    date,
    recipeVersion: recipe.version,
    cards,
    pillarDays,
    status: 'hazir',
    currentIndex: 0,
  };
}

/** Doz bittiğinde sütunların yolda bir gün ilerlemesi. Gelmeyen gün için ilerleme olmaz. */
export function advancePillars(pillars: Pillar[], dose: Dose): Pillar[] {
  return pillars.map((p) =>
    dose.pillarDays[p.id] !== undefined ? { ...p, currentDay: dose.pillarDays[p.id] + 1 } : p,
  );
}

/** Her sütunun kaç dozda gösterildiği (seçim adaleti için). */
export function countShown(doses: Dose[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const dose of doses) {
    for (const pillarId of new Set(dose.cards.map((c) => c.pillarId))) {
      counts[pillarId] = (counts[pillarId] ?? 0) + 1;
    }
  }
  return counts;
}
