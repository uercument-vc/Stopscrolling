/**
 * Günlük doz kişiselleştirme.
 *
 * Girdi: Kütüphaneden kurulmuş "temel doz" (uygulamadaki buildDose çıktısı) + kullanıcı bağlamı.
 * Çıktı: Aynı kartlar, metinleri kullanıcıya göre uyarlanmış hâlde.
 *
 * Güvenlik kuralları:
 * - Model kartın türünü, kimliğini, süresini, kaynağını DEĞİŞTİREMEZ; sadece metinleri uyarlar.
 * - Şemaya uymayan, aşırı uzun ya da yasaklı ifade içeren her kart için temel metin kullanılır.
 * - Yansıtma cevaplarında kriz işareti varsa model hiç çağrılmaz; uygulama destek kaynaklarını gösterir.
 * - Modele isim, e-posta gibi kişiyi tanımlayan bilgi gönderilmez (girdi şemasında böyle alan yok).
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Girdi sözleşmesi (uygulama → fonksiyon)
// ---------------------------------------------------------------------------

const CardType = z.enum(['ogren', 'uygula', 'ilham', 'yansit', 'tekrar']);
const Feedback = z.enum(['ise_yaradi', 'cok_kolay', 'cok_zor', 'zaten_biliyorum']);

const BaseCard = z.object({
  id: z.string().max(120),
  type: CardType,
  pillarId: z.string().max(60),
  title: z.string().max(200).optional(),
  body: z.string().max(1500),
  source: z.string().max(200).optional(),
  why: z.string().max(500),
  action: z
    .object({
      title: z.string().max(200),
      fallback: z.string().max(200),
      minutes: z.number().int().min(1).max(15),
      suggestedTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
});

export const PersonalizeInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  identity: z.string().max(300),
  tone: z.enum(['nazik', 'durust', 'sert']),
  pillars: z
    .array(
      z.object({
        id: z.string().max(60),
        title: z.string().max(60),
        why: z.string().max(300),
        level: z.enum(['baslangic', 'orta', 'ileri']),
        /** Bu sütunu doğuran, kullanıcının seçtiği özellikler. */
        motivatedBy: z.array(z.string().max(40)).max(5).default([]),
        /** Bu hafta: planlanan / yapılan eylem sayısı. */
        planned: z.number().int().min(0).max(50).optional(),
        done: z.number().int().min(0).max(50).optional(),
      }),
    )
    .min(1)
    .max(3),
  cards: z.array(BaseCard).min(1).max(8),
  recentFeedback: z
    .array(z.object({ cardTitle: z.string().max(200), feedback: Feedback }))
    .max(20)
    .default([]),
  recentReflections: z.array(z.string().max(280)).max(7).default([]),
  /** Kullanıcının kurulumda kendini anlattığı bilgiler (isim, e-posta gibi kimlik bilgisi içermez). */
  profile: z
    .object({
      desiredTraits: z.array(z.string().max(40)).max(5).default([]),
      selfDescription: z.string().max(300).default(''),
      futureDay: z.string().max(400).default(''),
      timeSinks: z.array(z.string().max(40)).max(8).default([]),
    })
    .optional(),
});

export type PersonalizeInput = z.infer<typeof PersonalizeInput>;
export type BaseCard = z.infer<typeof BaseCard>;

// ---------------------------------------------------------------------------
// Model çıktısı (structured outputs ile şemaya zorlanır)
// ---------------------------------------------------------------------------

export const ModelOutput = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      body: z.string(),
      action_title: z.string().nullable(),
      action_fallback: z.string().nullable(),
      /** "Bunu neden görüyorum?" açıklamasına eklenecek kısa kişisel not. */
      personal_note: z.string(),
    }),
  ),
});

export type ModelOutput = z.infer<typeof ModelOutput>;

export interface PersonalizeResult {
  cards: BaseCard[];
  /** Model kaç kartı gerçekten uyarladı (geri kalanı temel metin). */
  personalizedCount: number;
  /** 'kriz': yansıtma cevaplarında risk işareti var; uygulama destek ekranı göstermeli. */
  safety: 'ok' | 'kriz';
  /** Model çağrılmadıysa ya da başarısız olduysa nedeni. */
  fallbackReason?: 'kriz' | 'model_hatasi' | 'red' | 'gecersiz_cikti';
}

// ---------------------------------------------------------------------------
// Kurallar
// ---------------------------------------------------------------------------

/**
 * Türkçe küçük harf. JavaScript'in /i bayrağı "İ" harfini "i" saymaz; bu yüzden
 * "İnanırsan" ya da "İntihar" gibi büyük harfle başlayan ifadeler kaçabilirdi.
 * Karşılaştırmadan önce metni Türkçe kurallarla küçültüyoruz; kalıplar küçük harf yazılı.
 */
export const trLower = (text: string) => text.toLocaleLowerCase('tr-TR');

/** Kendine zarar verme işaretleri. Kaba bir ilk filtre; profesyonel bir sistemin yerini tutmaz. */
const CRISIS_PATTERNS = [
  /intihar/,
  /kendimi öldür/,
  /ölmek istiyorum/,
  /yaşamak istemiyorum/,
  /kendime zarar/,
  /her şeye son vermek/,
];

/** Ürün ilkeleriyle çelişen ifadeler: utandırma, kayıp korkusu, boş motivasyon. */
const BANNED_PATTERNS = [/inanırsan başarırsın/, /serini kaybedeceksin/, /milyoner/, /tembel/, /bahane(n)? yok/];

export function hasCrisisSignal(texts: string[]): boolean {
  return texts.some((t) => CRISIS_PATTERNS.some((p) => p.test(trLower(t))));
}

const TONE_GUIDE: Record<PersonalizeInput['tone'], string> = {
  nazik: 'Nazik bir arkadaş gibi: sıcak, cesaretlendirici, baskısız.',
  durust: 'Dürüst bir koç gibi: net, doğrudan, ama asla küçümseyici değil.',
  sert: 'Sert bir antrenör gibi: kısa, kararlı cümleler; yine de utandırma ve suçlama yok.',
};

/**
 * Sabit sistem talimatı. Değişken hiçbir şey (tarih, kullanıcı) burada yok; böylece
 * prompt önbelleği tüm kullanıcılar arasında paylaşılabilir.
 */
export const SYSTEM_PROMPT = `Sen, insanların sosyal medyada kaybettikleri zamanı olmak istedikleri kişiye doğru harcamalarına yardım eden bir uygulamanın içerik editörüsün. Uygulama her gün kısa, bitirilebilir bir "doz" hazırlar ve kullanıcıyı ekranda tutmak yerine hayatında küçük bir adım atmaya gönderir.

Sana içerik kütüphanesinden kurulmuş, insan tarafından yazılmış bir "temel doz" ve kullanıcı bağlamı verilecek. Görevin her kartın metnini bu kullanıcıya göre uyarlamak.

Uyarlama kuralları:
1. Kartın ana fikrini koru. Yeni bilgi, yeni iddia, yeni istatistik, yeni kaynak veya yeni kişi ekleme. Kaynakta olmayan bir araştırmadan söz etme.
2. Kullanıcının kimlik cümlesine, olmak istediği özelliklere, kendi anlattığı hâline ve "5 yıl sonra bir günüm" anlatımına uygun yerlerde kısaca bağlantı kur; her kartta değil, doğal düştüğünde. Örnekleri onun hayatından seç (ör. akşamları yorgunsa akşam için en küçük versiyonu öner). Kullanıcının yazdıklarını aynen alıntılama ve onu yargılama.
3. Kullanıcı bir konuda "çok kolay" ya da "zaten biliyorum" dediyse ilgili kartı bir adım derinleştir; "çok zor" dediyse sadeleştir.
4. Bir sütunda bu hafta eylemlerin çoğu yapılmadıysa o sütunun eylemini daha küçük ve somut hâle getir. Eylem hiçbir zaman kartta yazan süreyi aşamaz.
5. Utandırma, suçlama, başkalarıyla kıyas, kayıp korkusu ("serini kaybedeceksin") ve boş motivasyon cümleleri ("inanırsan başarırsın") yasak. Atlanan günler normaldir.
6. Sağlık, diyet, ilaç ya da finansal yatırım tavsiyesi verme.
7. Türkçe yaz: sade, samimi, "sen" diliyle. Öğren kartı en fazla 120 kelime, ilham kartı en fazla 50 kelime, yansıt kartı tek soru.
8. Her kart için verilen kimliği (id) aynen kullan ve her kartı tam bir kez döndür. Başlığı olmayan kartlarda title alanını null bırak; eylemi olmayan kartlarda action_title ve action_fallback alanlarını null bırak.
9. personal_note: Bu kartı bu kullanıcı için neden böyle uyarladığını tek kısa cümleyle anlat (ör. "Dün 'çok kolay' dediğin için bir adım derinleştirildi."). Uyarlama yapmadıysan boş bırak.`;

export function buildUserMessage(input: PersonalizeInput): string {
  const payload = {
    ton: TONE_GUIDE[input.tone],
    kimlik: input.identity,
    sutunlar: input.pillars.map((p) => ({
      id: p.id,
      baslik: p.title,
      neden: p.why,
      seviye: p.level,
      bu_sutunu_doguran_ozellikler: p.motivatedBy,
      bu_hafta_eylem: p.planned !== undefined ? { planlanan: p.planned, yapilan: p.done ?? 0 } : undefined,
    })),
    profil: input.profile
      ? {
          olmak_istedigi: input.profile.desiredTraits,
          su_anki_hali: input.profile.selfDescription || undefined,
          bes_yil_sonra_bir_gunu: input.profile.futureDay || undefined,
          bos_zamani_nereye_gidiyor: input.profile.timeSinks,
        }
      : undefined,
    son_geri_bildirimler: input.recentFeedback,
    son_yansitmalar: input.recentReflections,
    temel_doz: input.cards.map((c) => ({
      id: c.id,
      tur: c.type,
      sutun: c.pillarId,
      title: c.title ?? null,
      body: c.body,
      eylem: c.action ? { title: c.action.title, fallback: c.action.fallback, dakika: c.action.minutes } : null,
    })),
  };
  return `Aşağıdaki temel dozu bu kullanıcı için uyarla.\n\n${JSON.stringify(payload, null, 2)}`;
}

function acceptable(text: string, baseline: string): boolean {
  if (!text.trim()) return false;
  if (text.length > Math.max(600, baseline.length * 2)) return false;
  return !BANNED_PATTERNS.some((p) => p.test(trLower(text)));
}

/**
 * Model çıktısını temel dozla birleştirir. Sadece metin alanları değişebilir;
 * her alan ayrı ayrı doğrulanır, geçemeyen alan temel metinde kalır.
 */
export function mergeCards(base: BaseCard[], output: ModelOutput): { cards: BaseCard[]; personalizedCount: number } {
  const byId = new Map(output.cards.map((c) => [c.id, c]));
  let personalizedCount = 0;

  const cards = base.map((card): BaseCard => {
    const out = byId.get(card.id);
    if (!out) return card;

    const next: BaseCard = { ...card };
    let changed = false;

    if (acceptable(out.body, card.body) && out.body !== card.body) {
      next.body = out.body;
      changed = true;
    }
    if (card.title && out.title && acceptable(out.title, card.title) && out.title !== card.title) {
      next.title = out.title;
      changed = true;
    }
    if (card.action) {
      const action = { ...card.action };
      if (out.action_title && acceptable(out.action_title, card.action.title)) action.title = out.action_title;
      if (out.action_fallback && acceptable(out.action_fallback, card.action.fallback))
        action.fallback = out.action_fallback;
      // Süre, saat ve kart türü asla modelden gelmez.
      if (action.title !== card.action.title || action.fallback !== card.action.fallback) changed = true;
      next.action = action;
    }
    const note = out.personal_note.trim();
    if (changed && note && acceptable(note, note) && note.length <= 200) {
      next.why = `${card.why} · ${note}`;
    }
    if (changed) personalizedCount += 1;
    return next;
  });

  return { cards, personalizedCount };
}

/** Modeli çağıran fonksiyon. Testlerde sahtesi verilir; gerçeği index.ts'te. */
export type CallModel = (system: string, user: string) => Promise<
  { ok: true; output: ModelOutput } | { ok: false; reason: 'red' | 'gecersiz_cikti' | 'model_hatasi' }
>;

export async function personalizeDose(input: PersonalizeInput, callModel: CallModel): Promise<PersonalizeResult> {
  if (hasCrisisSignal(input.recentReflections)) {
    return { cards: input.cards, personalizedCount: 0, safety: 'kriz', fallbackReason: 'kriz' };
  }

  const result = await callModel(SYSTEM_PROMPT, buildUserMessage(input));
  if (!result.ok) {
    return { cards: input.cards, personalizedCount: 0, safety: 'ok', fallbackReason: result.reason };
  }

  const merged = mergeCards(input.cards, result.output);
  return { ...merged, safety: 'ok' };
}
