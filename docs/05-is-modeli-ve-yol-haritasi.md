# 5. İş Modeli ve Yol Haritası

## Gelir modeli: Freemium abonelik, reklam asla

Reklam modeli ürünün varoluş sebebiyle çelişir: Reklam geliri ekranda geçen süreyle artar. Biz kullanıcı **hayatında ilerleme hissettiğinde** kazanmalıyız. Abonelik bu teşviki hizalar: Kullanıcı ilerliyorsa öder, ilerlemiyorsa bırakır.

| | Ücretsiz | Premium |
|---|---|---|
| Sütun sayısı | 1 | 3 |
| Günlük doz, eylemler, check-in | ✓ | ✓ |
| Raf | ✓ | ✓ |
| Tarif kontrolü | Temel (süre, ton) | Tam (ağırlıklar, karışım, derinlik, yasaklı konular, sürüm geçmişi) |
| Haftalık Ayar (AI özeti ve öneriler) | — | ✓ |
| İleri seviye yollar | — | ✓ |
| Scroll yakalama (Faz 2) | — | ✓ |
| İstatistik ve aylık "dönüşüm raporu" | Temel | Tam |

Ücretsiz plan gerçekten işe yaramalı: Ürünün vaadini (bitirilebilir doz + eylem) deneyimlemek ücretsiz olmalı. Premium, **daha fazla kontrol ve derinlik** satar.

### Fiyatlandırma hipotezi
- Global: aylık $4,99–7,99 bandı; yıllık plan öne çıkarılır (~%40 indirim).
- Türkiye: App Store ve Play'in bölgesel fiyat kademeleriyle yerel fiyat.
- Faz 0'da ön satışla test edilir: "Kurucu üye: ilk yıl %50 indirim."

### Birim ekonomisi (kaba)
- LLM maliyeti: aktif kullanıcı başına ayda ~$0,5–1,1 (bkz. [Teknik mimari](04-teknik-mimari.md))
- Mağaza komisyonu: Apple ve Google'ın küçük işletme programlarında %15
- Altyapı (Supabase, RevenueCat, PostHog): ilk birkaç bin kullanıcıya kadar düşük ve büyük ölçüde sabit
- Sonuç: Ücretli kullanıcı başına brüt marj sağlıklı. Asıl zorluk maliyet değil, **tutunma ve ücretliye dönüşüm**.

### Sonraki gelir kanalları (Faz 3+)
- **Kurumsal (B2B):** Şirketlerin çalışan iyi oluşu ve öğrenme bütçeleri; üniversite kariyer merkezleri.
- **Uzman yolları:** Alanında uzman kişilerin hazırladığı yollar (gelir paylaşımıyla). Dikkat: Bu, ürünü bir "içerik üretici platformuna" çevirmemeli. Az sayıda, seçilmiş uzman.

## Pazara giriş

- **İronik ama işe yarar:** Sosyal medyadaki insanlara sosyal medyada ulaşmak. "Bu videoyu kapat ve şunu yap" formatında kısa içerikler. Her içerik bir eylemle biter, yani ürünün kendisini yansıtır.
- **Herkesin gözü önünde inşa etmek (build in public):** Geliştirme sürecini paylaşmak. Bu kategoride kurucu hikâyesi çok güçlü bir araç.
- **Kurucu üye programı:** Faz 0 katılımcıları ilk elçiler olur.
- **Davet:** "Bir arkadaşını davet et, ikiniz de 1 ay premium kazanın."
- **Topluluklar:** Üniversite kulüpleri, kişisel gelişim ve verimlilik toplulukları; global açılışta Product Hunt.
- **Türkçe öncelikli olmanın avantajı (doğrulanacak hipotez):** Kaliteli, kısa ve yapılandırılmış Türkçe kişisel gelişim içeriği az. Önce Türkiye'de güçlü bir çekirdek kitle, sonra İngilizce.

## Yol haritası

| Faz | Süre | Hedef | Çıkış kriteri |
|---|---|---|---|
| **0: Doğrulama** | 2–3 hafta | Görüşmeler, açılış sayfası, Telegram concierge testi | [Devam eşikleri](03-mvp-ve-dogrulama.md) tutuyor |
| **1: MVP** | 6–8 hafta | iOS + Android uygulama, 5 kimlik şablonu, kapalı beta (50–100 kişi), iOS Family Controls yetki başvurusu | Betada D30 tutunma ve HAG hedefleri tutuyor |
| **2: Lansman** | 3–5. ay | Herkese açık yayın, premium, scroll yakalama, dış kaynak küratörlüğü | Ücretliye dönüşüm ve D30 tutunma sürdürülebilir seviyede |
| **3: Büyüme** | 6. ay ve sonrası | Hesap verebilirlik ortağı (bire bir, sosyal akış değil), uzman yolları, B2B pilot, İngilizce sürüm | — |

### İlk 2 haftanın somut iş listesi
1. 15 görüşme planla (arkadaş çevresi ve kısa bir anket paylaşımıyla aday topla).
2. Açılış sayfasını yayına al (Carrd, Framer ya da basit bir sayfa + Tally formu).
3. Bir kimlik şablonu için ("Okuyan biri") 14 günlük doz içeriğini [hazır talimatla](../content/prompts/faz0-doz-uretimi.md) Claude'a ürettir, elle düzelt.
4. Ses ve ton rehberinin ilk sürümünü yaz (düzeltme yaparken kendiliğinden ortaya çıkacak).
5. Telegram botunu kur (zamanlanmış mesaj + butonlu cevap; kodsuz araçlarla da yapılabilir).
6. Devam / dur eşiklerini yaz ve sabitle.

## Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Ürünün kendisinin yeni bir "feed"e dönüşmesi | Yüksek | Ürün ilkeleri, bitiş ekranı, koruyucu metrikler (uygulamada fazla süre = alarm) |
| AI içeriğin jenerik ya da "yapay" hissettirmesi | Yüksek | İnsan onaylı kütüphane, ton rehberi, somut örnek zorunluluğu, kör kalite testleri |
| Düşük tutunma ("iyi niyet uygulaması" sendromu) | Yüksek | Faz 0'da ölçmek, sabit doz saati, haftalık hedef, küçük ilk zaferler, scroll yakalama |
| Kapsamın şişmesi (her şeyi birden yapmaya çalışmak) | Yüksek | Katı MVP kapsamı, "Won't" listesi, kararları ilkelere göre vermek |
| Yanlış ya da zararlı bilgi (sağlık, beslenme) | Orta | Konu kısıtları, kaynak zorunluluğu, bildirim butonu, inceleme kuyruğu |
| iOS Family Controls yetkisinin alınamaması ya da gecikmesi | Orta | Temel değer buna bağlı değil; Kısayollar yedeği |
| Büyük oyuncuların benzer özellik eklemesi | Orta | Kimlik + şeffaf algoritma konumlanması, topluluk, Türkçe öncelikli hız |
| Hassas kişisel veri | Orta | KVKK/GDPR, veri minimizasyonu, şifreleme, reklam ve izleme yok |

## Açık kararlar (senin vermen gerekenler)

1. **Dil ve pazar:** Türkçe öncelikli mi, baştan global mi? (Öneri: Türkçe öncelikli. İçerik kalitesini kontrol etmek ve hızlı öğrenmek daha kolay.)
2. **Teknik kapasite:** Kodu kim yazacak: sen, bir ortak, bir ajans? Stack seçimi buna göre netleşir.
3. **İçerik sorumlusu:** Kütüphaneyi kim onaylayacak? Özellikle "Hareket" gibi alanlarda bir uzman ortak iyi olur.
4. **İlk kimlik şablonları:** Listedeki 5'i mi, yoksa Faz 0 verisine göre başkaları mı?
5. **İsim:** "Stopscrolling" bir çalışma adı ve olumsuz bir fiil ("bırak"). Olumlu ("ol") bir isim daha güçlü olabilir. Birkaç yön:
   - **Rota:** "Rotanı sen çiz."
   - **Pusula:** yön bulma metaforu.
   - **Olmak / Becoming:** kimlik vurgusu; global karşılığı var.
   - **Dümen:** "Dümen sende." (Dikkat: argodaki "dümen çevirmek" olumsuz çağrışım yapar.)
   - Hangisi seçilirse seçilsin marka tescili ve mağaza adı uygunluğu kontrol edilmeli.
6. **Zaman ve bütçe:** Faz 0–1 için haftada kaç saat ve ne kadar bütçe ayrılabilir?
