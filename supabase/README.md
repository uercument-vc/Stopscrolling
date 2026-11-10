# Backend (Supabase)

Postgres şeması, içerik kütüphanesinin veritabanına aktarımı ve Claude ile doz kişiselleştirme fonksiyonu.

> Durum: Şema ve fonksiyon yazıldı ve yerel olarak test edildi; henüz bir Supabase projesine deploy edilmedi ve mobil uygulamaya bağlanmadı.

## İçerik

```
supabase/
├── config.toml
├── migrations/
│   ├── 20261109120000_ilk_sema.sql          # Tablolar, RLS, raf sınırı tetikleyicisi
│   └── 20261110120000_kurulum_profili.sql   # Profil, özellik kataloğu, anahtar kelimeler, talep görünümü
├── seed.sql                                 # Otomatik üretilir (aşağıya bak)
├── scripts/
│   ├── build-seed.mjs                       # content/tracks/*.json → seed.sql
│   ├── rls-smoke-test.sql                   # Şema + seed + RLS testi
│   └── rls-smoke-test.sh                    # Docker olmadan, düz PostgreSQL ile çalıştırır
└── functions/kisisellestir/                 # Claude ile kart metinlerini uyarlayan Edge Function
```

## Veritabanı

Tablolar `docs/04-teknik-mimari.md` içindeki veri modelini izler: `tracks`, `track_days`, `traits` (paylaşılan içerik), `profiles`, `pillars`, `recipes`, `recipe_changes`, `doses`, `cards`, `actions`, `dismissed_suggestions`.

`trait_demand` görünümü, kullanıcıların hangi hedefleri seçtiğini sayar; özellikle henüz yolu olmayan hedefler (`yolu_yok = true`) içerik yol haritası için talep sinyalidir. İçerik ekibi servis rolüyle sorgular.

Kurallar veritabanında da zorunlu:
- **RLS:** Herkes sadece kendi satırlarını görür ve yazar.
- **İçerik onayı:** Kullanıcılar sadece `status = 'live'` olan yolları okuyabilir. Taslak içerik incelenince `live` yapılır.
- **Raf en fazla 7 öğe:** Tetikleyiciyle zorunlu.
- **Eylem en fazla 15 dakika:** `check` kısıtı.

### Seed

İçeriğin tek kaynağı `content/tracks/*.json` ve `content/traits.json`. İçerik değişince:

```bash
node supabase/scripts/build-seed.mjs
```

### Test (Docker gerekmez)

```bash
supabase/scripts/rls-smoke-test.sh
```

Geçici bir veritabanı açar, Supabase `auth` şemasının küçük bir taklidini kurar, göçü ve seed'i (iki kez) çalıştırır, sonra şunları doğrular: Kullanıcılar birbirinin verisini göremez ve başkası adına yazamaz, sadece `live` içerik görünür, 8. raf öğesi ve 15 dakikadan uzun eylem reddedilir.

## Kişiselleştirme fonksiyonu: `kisisellestir`

`POST /functions/v1/kisisellestir`. Uygulama, kütüphaneden kurduğu temel dozu ve kullanıcı bağlamını gönderir. Fonksiyon kart metinlerini kullanıcıya göre uyarlatıp geri döner.

- **Model:** `claude-opus-5-5`, `effort: low`, yapılandırılmış çıktı (JSON şeması), sabit sistem talimatı için prompt caching. Güvenlik sınıflandırıcısı reddederse istek sunucu tarafında başka bir modele yönlendirilir (`fallbacks: "default"`).
- **Model neyi değiştiremez:** Kart türü, kimliği, eylem süresi, saati ve kaynak. Sadece metinler uyarlanır; her alan ayrı ayrı doğrulanır.
- **Doz asla bozulmaz:** Model hata verirse, reddederse, geçersiz ya da yasaklı ifade içeren çıktı üretirse ilgili kartta temel metin kalır.
- **Kriz işareti:** Yansıtma cevaplarında kendine zarar işareti varsa model çağrılmaz ve yanıtta `safety: "kriz"` döner. Uygulama bu durumda destek ekranı göstermeli (henüz yapılmadı). Bu kaba bir anahtar kelime filtresi; profesyonel bir sistemin yerini tutmaz.
- **Kurulum profili:** İsteğe bağlı `profile` alanıyla kullanıcının olmak istediği özellikler, kendi anlattığı hâli ve "5 yıl sonra bir günüm" anlatımı modele gider; model örneklerini kullanıcının hayatından seçer, yazdıklarını aynen alıntılamaz.
- **Gizlilik:** Girdi şemasında isim, e-posta gibi alan yok; modele sadece kimlik cümlesi, profil, nedenler, geri bildirimler ve kartlar gider.

### Yerel test

```bash
cd supabase/functions/kisisellestir
deno test kisisellestirme.test.ts   # sahte modelle, API anahtarı gerekmez
deno check index.ts
```

### Deploy

```bash
supabase link --project-ref <proje-ref>
supabase db push
supabase secrets set ANTHROPIC_API_KEY=<anahtar>
supabase functions deploy kisisellestir
```

> Fonksiyon bu ortamda gerçek Claude API'siyle çağrılmadı (anahtar yok). İlk deploy'dan sonra birkaç gerçek dozla çıktı kalitesini ve token kullanımını kontrol et; maliyet tahmini `docs/04-teknik-mimari.md` içinde.
