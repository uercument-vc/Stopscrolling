/**
 * Domain tipleri. Bu dosya UI'dan ve depolamadan bağımsızdır; aynı şekil
 * Supabase şemasında ve içerik kütüphanesinde (content/tracks) kullanılır.
 */

/** Yerel takvim günü, "YYYY-MM-DD". */
export type DateKey = string;

/** Saat, "HH:MM". */
export type TimeOfDay = string;

export type Level = 'baslangic' | 'orta' | 'ileri';
export type Tone = 'nazik' | 'durust' | 'sert';
export type DailyBudget = 5 | 10 | 15;

// ---------------------------------------------------------------------------
// İçerik kütüphanesi (insan onaylı, paylaşılan)
// ---------------------------------------------------------------------------

export interface TrackDay {
  day: number;
  theme: string;
  learn: { title: string; body: string; source?: string };
  do: {
    title: string;
    body: string;
    /** Takvime girecek somut eylem. */
    action: string;
    /** Kötü gün versiyonu: atlamak yerine küçültmek. */
    fallback: string;
    minutes: number;
    suggestedTime: TimeOfDay;
  };
  inspire?: { body: string; source?: string };
  reflect: { question: string };
}

export interface Track {
  /** Kimlik şablonu kimliği; sütun kimliği olarak da kullanılır. */
  id: string;
  templateTitle: string;
  pillarTitle: string;
  /** Kimlik cümlesi için sıfat-fiil: "her gün okuyan". */
  identityPhrase: string;
  description: string;
  whyPlaceholder: string;
  level: Level;
  /** İçerik inceleme durumu. */
  status: 'draft' | 'reviewed' | 'live';
  weeks: { week: number; theme: string }[];
  days: TrackDay[];
}

// ---------------------------------------------------------------------------
// Kullanıcı modeli
// ---------------------------------------------------------------------------

export interface Pillar {
  id: string;
  trackId: string;
  title: string;
  why: string;
  level: Level;
  /** Yolda gösterilecek sıradaki gün (1'den başlar). */
  currentDay: number;
}

/** Tarif: algoritmanın kendisi. Kullanıcı görür ve düzenler. */
export interface Recipe {
  version: number;
  budget: DailyBudget;
  tone: Tone;
  /** Göreli ağırlıklar (0 = duraklatıldı). Yüzde, toplamdan hesaplanır. */
  weights: Record<string, number>;
  includeInspire: boolean;
  includeReflect: boolean;
  doseTime: TimeOfDay;
}

export interface RecipeChange {
  version: number;
  date: DateKey;
  changes: string[];
  by: 'kullanici' | 'oneri';
  /** Bu sürümün tam hâli: geri dönebilmek için. */
  snapshot: Recipe;
}

export type CardType = 'ogren' | 'uygula' | 'ilham' | 'yansit' | 'tekrar';

export type Feedback = 'ise_yaradi' | 'cok_kolay' | 'cok_zor' | 'zaten_biliyorum';

export interface CardAction {
  title: string;
  fallback: string;
  minutes: number;
  suggestedTime: TimeOfDay;
}

export interface DoseCard {
  id: string;
  type: CardType;
  pillarId: string;
  title?: string;
  body: string;
  source?: string;
  trackRef: { trackId: string; day: number };
  /** "Bunu neden görüyorum?" açıklaması. */
  why: string;
  action?: CardAction;
  feedback?: Feedback;
  answer?: string;
  /** Uygula kartı için kullanıcının kararı. */
  decision?: 'planlandi' | 'kucuk' | 'rafa' | 'gecildi';
}

export interface Dose {
  id: string;
  date: DateKey;
  recipeVersion: number;
  cards: DoseCard[];
  /** Bu dozda gösterilen yol günleri: sütun kimliği → gün. */
  pillarDays: Record<string, number>;
  status: 'hazir' | 'basladi' | 'bitti';
  currentIndex: number;
  finishedAt?: string;
}

export type ActionStatus = 'planli' | 'rafta' | 'yapildi' | 'kismen' | 'yapilmadi' | 'birakildi';

export interface Action {
  id: string;
  cardId: string;
  pillarId: string;
  title: string;
  fallback: string;
  minutes: number;
  /** Eylemin yapılacağı gün (raf için taahhüt tarihi). */
  plannedFor: DateKey;
  time?: TimeOfDay;
  /** Kullanıcı küçük versiyonu mu seçti? */
  small: boolean;
  /** Bu eylem için hatırlatma bildirimi kuruldu mu? */
  reminder?: boolean;
  status: ActionStatus;
  createdOn: DateKey;
  resolvedOn?: DateKey;
}

export interface Checkin {
  date: DateKey;
  note?: string;
}

export interface OnboardingInput {
  identity: string;
  pillars: { trackId: string; why: string; level: Level }[];
  budget: DailyBudget;
  tone: Tone;
  doseTime: TimeOfDay;
  baselineSocialHours: string;
}
