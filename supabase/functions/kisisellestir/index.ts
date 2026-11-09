/**
 * POST /functions/v1/kisisellestir
 *
 * Gövde: PersonalizeInput (bkz. kisisellestirme.ts). Yanıt: PersonalizeResult.
 * Kimlik doğrulama: Supabase JWT (config.toml → verify_jwt = true).
 *
 * Gerekli gizli değişken: ANTHROPIC_API_KEY
 *   supabase secrets set ANTHROPIC_API_KEY=...
 *
 * Model hata verirse, reddederse ya da geçersiz çıktı üretirse fonksiyon yine 200 döner
 * ve temel (kütüphane) metni geri verir: Kullanıcının dozu asla kişiselleştirme yüzünden bozulmaz.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { type CallModel, ModelOutput, PersonalizeInput, personalizeDose } from './kisisellestirme.ts';

const MODEL = 'claude-opus-5-5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// İstemci ilk çağrıda kurulur: Anahtar eksikse fonksiyon çökmez, temel dozu döndürür.
let client: Anthropic | undefined;

const callClaude: CallModel = async (system, user) => {
  try {
    client ??= new Anthropic();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Güvenlik sınıflandırıcısı reddederse istek sunucu tarafında uygun bir modele yönlendirilir.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Sistem talimatı tüm kullanıcılar için aynı: önbelleğe alınır.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      // Günlük uyarlama basit bir iş: düşük effort, düşünme token'larını ve maliyeti azaltır.
      output_config: { effort: 'low', format: betaZodOutputFormat(ModelOutput) },
      messages: [{ role: 'user', content: user }],
    });

    if (response.stop_reason === 'refusal') return { ok: false, reason: 'red' };
    if (response.stop_reason !== 'end_turn' || !response.parsed_output) {
      return { ok: false, reason: 'gecersiz_cikti' };
    }
    return { ok: true, output: response.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn('[kisisellestir] hız sınırı');
    else if (error instanceof Anthropic.APIError) console.error(`[kisisellestir] API ${error.status}: ${error.message}`);
    else console.error('[kisisellestir] beklenmeyen hata', error);
    return { ok: false, reason: 'model_hatasi' };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return Response.json({ error: 'Sadece POST' }, { status: 405, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  const parsed = PersonalizeInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Geçersiz girdi', issues: parsed.error.issues.slice(0, 5) },
      { status: 400, headers: corsHeaders },
    );
  }

  const result = await personalizeDose(parsed.data, callClaude);
  return Response.json(result, { headers: corsHeaders });
});
