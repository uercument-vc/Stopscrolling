# Stopscrolling (çalışma adı)

> **Algoritma seni değil, sen algoritmayı yönetiyorsun.**

Kim olmak istediğini sen tanımlarsın. Uygulama her gün sana **bitirilebilir**, **uygulanabilir** ve **senin seçtiğin** bir "günlük doz" hazırlar: öğren → uygula → yansıt. Sonra seni hayatına geri gönderir.

Sonsuz feed yerine bitiş çizgisi olan bir gün. Kaydetmek yerine yapmak. Başkalarıyla kıyas yerine dünkü sen.

## Şu an neredeyiz?

**Faz 1 iskeleti hazır.** Çekirdek döngü uçtan uca çalışıyor (çevrimdışı, cihazda):

- **Tanıtım:** 5 sayfa, atlanabilir. Kullanıcı neden bu uygulamayı kullanmalı, kullanınca ne olacak, ne bekleyebilir. İlk dozda kart türlerini anlatan ipuçları.
- **Onboarding:** 5 kimlik şablonu, kimlik cümlesi, sütunlar, nedenler, zaman bütçesi, tarif önizlemesi.
- **Günlük doz:** Öğren → uygula → ilham → yansıt. Her kartta "Bunu neden görüyorum?" ve açık geri bildirim; doz bitince "Bugünlük bu kadar." ekranı.
- **Uygula kartı:** "Kaydet" yok. Seçenekler: bugün yap, küçük versiyonu yap, tarihli olarak rafa koy (en fazla 7 öğe) ya da geç.
- **Eylemler:** Akşam check-in (yaptım / kısmen / olmadı) ve önceki günlerden kalanlar.
- **Yolum:** Haftalık ritim ("anlamlı gün" sayacı), sütun ilerlemesi ve öner–onayla mantığıyla haftalık ayar önerisi.
- **Tarif:** Algoritmanın tamamı tek ekranda. Değişiklikler sürümlenir ve eski bir sürüme geri dönülebilir.
- **İçerik:** 5 yolun ilk haftası (35 gün, taslak).

Backend iskeleti de hazır ama henüz uygulamaya bağlı değil: Supabase şeması (RLS dahil) ve Claude ile doz kişiselleştirme fonksiyonu.

## Hızlı başlangıç

```bash
cd apps/mobile
npm install
npx expo start      # QR kodu Expo Go ile okut ya da web için "w"
```

Ayrıntılar: [apps/mobile/README.md](apps/mobile/README.md) · [supabase/README.md](supabase/README.md)

## Repo yapısı

```
apps/mobile/     Expo (React Native) uygulaması
content/         İçerik kütüphanesi (yollar JSON olarak) ve üretim talimatları
supabase/        Veritabanı şeması, seed, RLS testi, kişiselleştirme fonksiyonu
docs/            Ürün dokümanları
```

## Dokümanlar

| # | Doküman | İçerik |
|---|---|---|
| 1 | [Vizyon ve problem](docs/01-vizyon-ve-problem.md) | Problemin kökü, ürün ilkeleri, hedef kullanıcı, rakipler |
| 2 | [Ürün tasarımı](docs/02-urun-tasarimi.md) | Kavramlar, çekirdek döngü, günlük doz, "algoritmayı sen yönet" |
| 3 | [MVP ve doğrulama](docs/03-mvp-ve-dogrulama.md) | Kod yazmadan test, MVP kapsamı, metrikler |
| 4 | [Teknik mimari](docs/04-teknik-mimari.md) | Stack, içerik hattı, veri modeli, maliyet |
| 5 | [İş modeli ve yol haritası](docs/05-is-modeli-ve-yol-haritasi.md) | Gelir, pazara giriş, fazlar, riskler, açık kararlar |

Araçlar:
- [Faz 0: Günlük doz üretim talimatı](content/prompts/faz0-doz-uretimi.md): Yeni içerik günlerini Claude ile üretmek için hazır talimat.

## Testler

```bash
cd apps/mobile && npm test && npm run typecheck && npm run lint   # 77 test
supabase/scripts/rls-smoke-test.sh                                # şema + RLS (yerel PostgreSQL)
cd supabase/functions/kisisellestir && deno test                  # kişiselleştirme (sahte model)
```
