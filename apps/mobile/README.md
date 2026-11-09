# Mobil uygulama (Expo)

React Native + Expo (SDK 58) + TypeScript. iOS, Android ve web'de tek kod tabanı.

Şu an **tamamen çevrimdışı** çalışır: İçerik uygulamayla birlikte paketlenir, veriler cihazda (AsyncStorage) tutulur. Supabase ve kişiselleştirme servisi henüz bağlı değil; bkz. [Sıradaki adımlar](#sıradaki-adımlar).

## Çalıştırma

```bash
cd apps/mobile
npm install
npx expo start
```

- **Telefonda:** App Store / Play Store'dan **Expo Go**'yu indir, terminaldeki QR kodu okut.
- **Tarayıcıda:** Terminalde `w` tuşuna bas ya da `npm run web`.

Döngüyü birkaç gün boyunca denemek için **Bugün** ekranının altındaki *Geliştirici → Sonraki güne geç* butonunu kullan (sadece geliştirme modunda görünür). Takvimi bir gün ileri sarar; yeni günün dozu kurulur, raftaki eylemler tarihi gelince düşer.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm start` | Geliştirme sunucusu |
| `npm test` | Domain mantığı ve içerik testleri (Jest) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |

## Yapı

```
src/
├── app/                    # Ekranlar (expo-router, dosya tabanlı yönlendirme)
│   ├── _layout.tsx         # Kök: onboarding bitmeden sekmeler korunur
│   ├── onboarding.tsx      # 6 adım: kimlik, sütunlar, neden, zaman, tarif
│   ├── doz.tsx             # Günlük doz akışı + bitiş ekranı
│   └── (tabs)/             # Bugün · Eylemler · Yolum · Tarif
├── domain/                 # Saf iş mantığı (UI'dan bağımsız, test edilir)
│   ├── dose-builder.ts     # Dozu kuran algoritma: sütun seçimi, kartlar, "neden" açıklamaları
│   ├── recipe.ts           # Tarif: ağırlıklar, değişiklik açıklamaları, kimlik cümlesi
│   ├── metrics.ts          # Anlamlı gün (North Star), haftalık özet, öner–onayla
│   ├── actions.ts          # Eylem listeleri, raf kuralı (en fazla 7)
│   ├── copy.ts             # Tona göre arayüz metinleri
│   └── turkce.ts           # Türkçe büyük harf, saat ekleri ("21:30'da", "20:00'de")
├── store/app-store.ts      # Zustand + kalıcı depolama
├── content/library.ts      # Repo kökündeki content/tracks/*.json'u yükler
├── services/notifications  # Yerel bildirimler (web'de boş uygulama)
└── components/             # UI parçaları
```

İçerik kütüphanesi repo kökündeki `content/` klasöründe; `metro.config.js` bu klasörü pakete dahil eder.

## Algoritma (dose-builder.ts)

1. **Bütçe → slot:** 5 dk = 1 sütun, 10 dk = 2, 15 dk = 3.
2. **Sütun seçimi:** Slot tüm sütunlara yetmiyorsa her sütunun hak ettiği gösterim (ağırlık payı × toplam) ile gerçek gösterim karşılaştırılır; en çok geride kalan seçilir. %60 / %40 ağırlık zamanla 6'ya 4 gösterim olur.
3. **Kartlar:** Her seçili sütun için yoldaki sıradaki günün *öğren* + *uygula* kartı. Tarifte açıksa en fazla 1 *ilham* ve 1 *yansıt*.
4. **İlerleme:** Sütun, sadece doz bitirilince bir gün ilerler. Uygulamayı 3 gün açmasan da kaldığın yerden devam edersin; "kaçırdın" yok.
5. **İçerik bitince:** Yeni bilgi yerine *tekrar* günü.

Sadece açık sinyaller kullanılır: Kullanıcının belirlediği ağırlıklar ve gösterim geçmişi. Ekranda kalma süresi ölçülmez.

## Bilinen kısıtlar

- **Bildirimler** sadece iOS/Android'de çalışır, web'de devre dışı. Gerçek cihazda henüz test edilmedi.
- **İçerik taslak:** 5 yolun ilk haftası (7 gün) yazıldı; `status: "draft"`, yani yayından önce insan gözünden geçmeli. 2–4. haftalar "Hazırlanıyor" görünür.
- **Seviye seçimi** (orta/ileri) kaydedilir ama şimdilik herkes temel yoldan başlar.
- **Ödeme duvarı yok:** Ücretsiz/premium ayrımı (1 sütun / 3 sütun) henüz uygulanmadı.
- Bu ortamda Metro dosya değişikliklerini her zaman yakalayamadı; değişiklik görünmezse `npx expo start --clear`.

## Sıradaki adımlar

1. Supabase Auth (e-posta / Apple / Google ile giriş) ve verilerin sunucuyla eşitlenmesi. Şema hazır: `supabase/migrations/`.
2. Doz kurulduktan sonra `kisisellestir` fonksiyonunu çağırıp kart metinlerini kullanıcıya göre uyarlamak; fonksiyon hata verirse temel metin kalır.
3. Gerçek cihazda bildirim testi ve bir EAS (development build) kurulumu.
