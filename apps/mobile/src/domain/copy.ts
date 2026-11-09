import type { Tone } from './types';

/**
 * Tona göre değişen arayüz metinleri. Kural: Ton ne olursa olsun utandırma yok.
 * Kart metinlerinin tona göre uyarlanması kişiselleştirme servisinin işi.
 */
export const COPY: Record<
  Tone,
  { finishTitle: string; finishBody: string; skipped: string; smallChosen: string; checkinPrompt: string }
> = {
  nazik: {
    finishTitle: 'Bugünlük bu kadar.',
    finishBody: 'Gerisi hayatta. Kendine iyi bak.',
    skipped: 'Olur. Bugün böyle bir gün.',
    smallChosen: 'Küçük adım da adımdır.',
    checkinPrompt: 'Bugün nasıl geçti?',
  },
  durust: {
    finishTitle: 'Bugünlük bu kadar.',
    finishBody: 'Okumak kısmı bitti. Asıl iş şimdi, hayatta.',
    skipped: 'Tamam. Yarın küçük versiyonuyla devam.',
    smallChosen: 'İyi seçim: Atlamak yerine küçültmek alışkanlığı korur.',
    checkinPrompt: 'Planladıklarını yaptın mı?',
  },
  sert: {
    finishTitle: 'Doz bitti.',
    finishBody: 'Telefonu bırak ve ilk eylemine geç.',
    skipped: 'Bugün geçtin. Yarın en küçük versiyonla başla.',
    smallChosen: 'Küçük ama bugün. Şimdi yap.',
    checkinPrompt: 'Söz verdiklerin: yapıldı mı?',
  },
};
