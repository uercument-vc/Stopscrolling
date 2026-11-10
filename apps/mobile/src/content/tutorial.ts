/**
 * Tanıtım metinleri: Kullanıcı neden bu uygulamayı kullanmalı ve kullandığında ne olacak?
 *
 * Kurallar (docs/02-urun-tasarimi.md → Motivasyon ve ton rehberi):
 * - Kullanıcıyı suçlama yok ("Sorun sende değil").
 * - Abartılı vaat yok: Değişimi garanti etmiyoruz, ne yapacağımızı ve ne ölçeceğimizi söylüyoruz.
 * - Kısa: Tamamı 250 kelimenin altında, yaklaşık 1–1,5 dakikada okunur (testle korunuyor).
 */
import type { CardType } from '@/domain/types';

export type TutorialVisual = 'akis' | 'karsilastirma' | 'gun' | 'beklenti' | 'soz';

export interface TutorialPage {
  id: TutorialVisual;
  kicker: string;
  title: string;
  body: string[];
}

export const TUTORIAL_PAGES: TutorialPage[] = [
  {
    id: 'akis',
    kicker: 'Neden buradasın?',
    title: 'Bugün kaç kez “bir tane daha” dedin?',
    body: [
      'Kaydettiğin video yapmış gibi hissettirir, gündem bir şeyi kaçırdığını söyler, başkalarının en iyi anları seni yetersiz hissettirir.',
      'Sorun sende değil: Akış senin hedeflerin için değil, dikkatin için tasarlandı.',
    ],
  },
  {
    id: 'karsilastirma',
    kicker: 'Burada ne farklı?',
    title: 'Algoritma seni değil, sen algoritmayı yönetirsin.',
    body: [
      'Kim olmak istediğini sen söylersin; sana sadece o yöne götüren içerikler gelir. Her kartta onu neden gördüğün yazar.',
    ],
  },
  {
    id: 'gun',
    kicker: 'Nasıl çalışır?',
    title: 'Bir gün böyle geçer',
    body: ['Uygulamada günde 5–15 dakika. Gerisi senin.'],
  },
  {
    id: 'beklenti',
    kicker: 'Ne bekleyebilirsin?',
    title: 'Büyük bir dönüşüm değil, her gün küçük bir adım',
    body: [],
  },
  {
    id: 'soz',
    kicker: 'Sözümüz',
    title: 'Seni ekranda tutmaya çalışmayacağız',
    body: [],
  },
];

/** 1. sayfa: Bitmeyen akışı ve tuzaklarını gösteren temsili gönderiler. */
export const FEED_EXAMPLES = [
  { text: 'Hayatını değiştirecek 7 sabah alışkanlığı', tag: 'Kaydedildi' },
  { text: 'Okunması gereken 30 kitap', tag: 'Kaydedildi' },
  { text: 'Herkes bunu konuşuyor', tag: 'Gündem' },
  { text: 'O senin yaşındayken neler başardı', tag: 'Kıyas' },
];

/** 2. sayfa: Akış ile bu uygulama arasındaki fark. */
export const COMPARISON = [
  { from: 'Sonsuz akış', to: 'Her gün biten doz' },
  { from: 'Kaydet, sonra unut', to: 'Bugün yap ya da tarih ver' },
  { from: 'Gizli algoritma', to: 'Senin yönettiğin tarif' },
  { from: 'Beğeni ve kıyas', to: 'Sadece dünkü sen' },
];

/** 3. sayfa: Bir günün akışı. */
export const DAY_STEPS = [
  { when: 'Sabah · 10 dk', what: 'Dozun hazır: Bir fikir öğrenirsin.' },
  { when: 'Hemen ardından', what: 'Onu küçük bir eyleme çevirirsin. “Kaydet” yok.' },
  { when: 'Gün içinde', what: 'Uygulamayı kapatırsın. Asıl iş hayatta.' },
  { when: 'Akşam · 30 sn', what: 'Yaptıysan işaretlersin. Yapmadıysan sorun değil.' },
];

/** 4. sayfa: Kullanırken ne olmasını bekliyoruz? Garanti değil, hedef. */
export const EXPECTATIONS = [
  { when: 'İlk hafta', what: 'Gülünç derecede küçük adımlar. Amaç çok değil, her gün yapmak.' },
  { when: '2–3. hafta', what: 'Ritmin oturur; tarifini sana uyana göre ayarlarsın.' },
  {
    when: '1 ay sonra',
    what: 'Sosyal medya süreni başlangıçla karşılaştırırız. Ölçtüğümüz uygulama süresi değil, hayatta yaptıkların.',
  },
];

export const EXPECTATION_NOTE =
  'Bazı günleri atlayacaksın. Sorun değil: Ceza yok, kaldığın yerden devam edersin.';

/** 5. sayfa: Yapmayacaklarımız ve kullanıcıdan tek beklentimiz. */
export const PROMISES = [
  'Sonsuz akış yok: Doz biter.',
  'Beğeni, takipçi, sıralama yok.',
  'Korkutan bildirim yok; günde en fazla 2.',
  'Reklam yok, verilerin satılmaz.',
];

export const OUR_ASK = 'Senden tek istediğimiz: günde birkaç dakika ve küçük bir adım.';

/**
 * İlk doz ipuçları: Kullanıcı kart türlerini ilk kez görürken, o kartın ne işe yaradığını
 * tam o anda anlatır. Sadece ilk dozda gösterilir.
 */
export const FIRST_DOSE_HINTS: Partial<Record<CardType, string>> = {
  ogren:
    'İlk dozun! Her öğren kartı tek bir fikir anlatır. Okuduktan sonra işe yarayıp yaramadığını işaretleyebilirsin; algoritman bunu dikkate alır.',
  uygula:
    'Burada “kaydet” yok. Fikri bir eyleme çevir: Bugün yap, küçük versiyonunu seç ya da tarih verip rafa koy.',
  ilham: 'İlham kartları başkalarının sonuçlarını değil, süreçlerini anlatır. Kıyas için değil, yol göstermek için.',
  yansit: 'Tek satır yeterli, istersen boş da geçebilirsin. Cevabın yarınki dozunu sana göre ayarlamak için kullanılır.',
};

export const FIRST_DOSE_FINISH =
  'İlk dozunu bitirdin. Şimdi uygulamayı kapat; akşam Bugün ekranındaki “Bugün nasıl geçti?” bölümünden eylemini işaretle.';
