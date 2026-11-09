# 3. MVP ve Doğrulama

## En riskli varsayımlar

Ürünleri genelde teknik sorunlar değil, yanlış çıkan varsayımlar öldürür. Risk sırasına göre:

| # | Varsayım | Yanlışsa ne olur | Nasıl test edilir |
|---|---|---|---|
| 1 | İnsanlar kendi tanımladıkları günlük doza **her gün geri döner** | Ürün yok | Concierge testi, 14 gün |
| 2 | Önerilen **eylemleri gerçekten yaparlar** | "Bir içerik uygulaması daha" oluruz | Eylem tamamlama oranı |
| 3 | AI ile üretilen içerik **besleyici, doğru ve kişisel** hissettirir | Jenerik içerik, hızlı kayıp | Kart geri bildirimi, görüşmeler |
| 4 | Sosyal medya süresi **gerçekten azalır** | Ana vaat boşa çıkar | Önce/sonra ekran süresi ölçümü |
| 5 | İnsanlar bunun için **para öder** | İş modeli yok | Ön satış, kurucu üyelik |

## Faz 0: Kod yazmadan doğrulama (2–3 hafta)

### Adım 1: 15 görüşme (1. hafta)
Hedef kitleden 15 kişiyle 20'şer dakikalık görüşmeler. Fikri **anlatmadan önce** davranışı sor:

1. En son "yeter artık" deyip telefonu bıraktığın anı anlatır mısın? Ne olmuştu?
2. Sosyal medyada geçirdiğin zamanı azaltmak için ne denedin? Ne oldu, neden bıraktın?
3. Kaydettiğin içeriklere en son ne zaman geri döndün?
4. Şu an "keşke buna vakit ayırabilsem" dediğin 1–3 şey ne?
5. Bunlar için şu an ne kullanıyorsun? Para ödediğin bir şey var mı?
6. (En sonda fikri anlat.) Bu ne zaman işine yarardı? Ne zaman kullanmazdın?

Dikkat edilecek sinyaller: tekrar eden dertler, denenip bırakılan çözümler, insanların kullandığı kelimeler. Pazarlama dili buradan çıkar.

### Adım 2: Açılış sayfası ve bekleme listesi (1–2. hafta)
- Tek sayfa: problem, vaat, 3 ekran taslağı (Figma), e-posta formu.
- 2–3 farklı başlık dene, hangisinin daha çok kayıt aldığını ölç:
  - "Algoritmayı sen yönet."
  - "Sonsuz feed yerine 10 dakikalık bir gün."
  - "Kaydetmeyi bırak, yapmaya başla."
- Kayıt formunda tek soru: "Kim olmak istiyorsun?" Bu cevaplar, kimlik şablonlarını seçmek için çok değerli bir veri.

### Adım 3: Telegram botuyla 14 günlük concierge MVP (2–3. hafta)
Uygulamayı yazmadan önce **deneyimin kendisini** test et:

- **Katılımcılar:** Bekleme listesinden 20–30 kişi.
- **Kurulum:** Telegram botu (ya da WhatsApp Business). Her sabah kullanıcının seçtiği saatte doz gelir: 4–5 mesaj (öğren → uygula → ilham → yansıt). Akşam tek soru: "Bugünkü eylemi yaptın mı?" (Evet / Kısmen / Hayır)
- **İçerik:** Claude ile üretilir, göndermeden önce sen kontrol edersin. Hazır talimat: [Faz 0 doz üretim talimatı](../content/prompts/faz0-doz-uretimi.md). Bu kontrol süreci aynı zamanda ton rehberini yazmanı sağlar.
- **Ölçüm:** 0. ve 14. günde telefonun ekran süresi ekran görüntüsü.
- **Kapanış:** 14. günde kısa bir görüşme ve "kurucu üye" ön satış teklifi (ör. ilk yıl indirimli yıllık plan).

Bu aşama yarı manuel olabilir. Amaç ölçeklenmek değil, öğrenmek.

### Devam / dur kriterleri (Faz 0 sonu)
Aşağıdaki eşikler başlangıç hipotezleri. Görüşmelerden sonra kalibre edilebilirler, ama **testten önce yazılı olarak sabitlenmeleri** gerekir. Sonuçlara bakıp hedefi kaydırmak, testi anlamsızlaştırır.

| Metrik | Devam eşiği |
|---|---|
| 2. haftada dozunu haftada en az 4 gün açan katılımcı oranı | ≥ %40 |
| Tamamlanan eylem oranı ("Evet" + "Kısmen") | ≥ %35 |
| 14. günde sosyal medya süresindeki düşüş (medyan) | ≥ %15 |
| Ön satışı kabul eden ya da "kesin öderim" diyen oranı | ≥ %20 |

Eşiklerin çoğu tutmazsa: Neyin tutmadığını görüşmelerle anla, tek bir değişkeni değiştir (doz süresi, gönderim saati, kimlik şablonu gibi) ve bir hafta daha dene.

## Faz 1: MVP uygulama (6–8 hafta)

### Kapsam (MoSCoW)

| Öncelik | Özellik |
|---|---|
| **Must** | Onboarding (5 kimlik şablonu + serbest yazım), 1–3 sütun |
| **Must** | Günlük doz (4–7 kart) ve bitiş ekranı |
| **Must** | Uygula kartı → eylem + yerel hatırlatma bildirimi |
| **Must** | Akşam check-in (30 sn) |
| **Must** | Tarif ekranı (sütun ağırlıkları, süre, karışım, ton) |
| **Must** | "Bunu neden görüyorum?" ve kart geri bildirimi |
| **Must** | Hesap, veri silme, temel gizlilik ayarları |
| **Should** | Raf (en fazla 7 öğe, tarihli, süreli) |
| **Should** | Haftalık Ayar (AI özeti + öneri + onay) |
| **Should** | "Bu hafta yaptıkların" ekranı (kendinle kıyas) |
| **Should** | Abonelik altyapısı (ödeme duvarı kapalı başlayabilir) |
| **Could** | Tarif sürüm geçmişi |
| **Could** | Sesli kart (metinden sese) |
| **Won't (şimdilik)** | Scroll yakalama, dış kaynak tarama, sosyal özellikler, web uygulaması, içerik üretici platformu |

### Başlangıç kimlik şablonları
Her biri için seviye başına 4 haftalık bir yol hazırlanır ve **insan gözünden geçer**:

1. **Okuyan biri:** okuma alışkanlığı, odak, okuduğunu hatırlamak
2. **Hareket eden biri:** sıfırdan hareket alışkanlığı (tıbbi ve diyet tavsiyesi yok)
3. **Üreten biri:** yazmak, çizmek, paylaşmak; tüketiciden üreticiye geçiş
4. **Yazılım öğrenen biri:** temel kavramlar + her gün mini pratik
5. **Odaklanan biri:** dijital minimalizm, derin çalışma, dikkat

Bu liste Faz 0'daki "Kim olmak istiyorsun?" cevaplarına göre güncellenir.

### Kapalı beta
- TestFlight ve Play iç test kanalıyla 50–100 kişi (öncelik Faz 0 katılımcılarında).
- 4 hafta sürer; her hafta 3–5 kullanıcı görüşmesi yapılır.

## Metrikler

### North Star metriği
**Haftalık Anlamlı Gün (HAG):** Kullanıcının bir haftada hem dozunu bitirdiği **hem de** en az bir eylemi tamamladığı gün sayısı.

Hedef: Aktif kullanıcıların çoğunluğunun haftada en az 3 anlamlı gün yaşaması.

Neden bu metrik? Sadece uygulama açılışını (tüketim) ya da sadece eylemi değil, **beslenme + uygulama** döngüsünün kapanmasını ölçüyor.

### Girdi metrikleri
- Onboarding tamamlama oranı
- Doz tamamlama oranı (açılan dozların kaçı bitirildi)
- Eylem tamamlama oranı
- 1. / 7. / 30. gün tutunma (D1 / D7 / D30)
- Haftalık Ayar tamamlama oranı
- Tarifini en az bir kez düzenleyen kullanıcı oranı (sahiplenme sinyali)

### Koruyucu metrikler (artarsa alarm)
- Günlük uygulama süresinin, kullanıcının kendi bütçesinin 2 katını aşması
- Bildirim kapatma oranı
- "Bu kart yanlış / uygunsuz" bildirimleri
- Raf'ta süresi dolan öğe oranı (kaydetme yanılsaması geri mi geliyor?)

### Sonuç metriği
- Kullanıcının bildirdiği (Faz 2'de doğrudan ölçülen) sosyal medya süresindeki değişim. Bu, pazarlamanın en güçlü kanıtı olacak: "Kullanıcılarımız ilk ayda sosyal medyada %X daha az zaman geçirdi."
