/**
 * Türkçeye özgü metin kuralları. Cihaz diline güvenmeden, her platformda aynı sonucu verir.
 */

/** Türkçe büyük harf: i → İ, ı → I. ("Pazartesi" → "PAZARTESİ") */
export function toTurkishUpper(text: string): string {
  return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

// Sayının okunuşundaki son kelimeye göre bulunma eki (-de/-da/-te/-ta).
// birler: bir-de, iki-de, üç-te, dört-te, beş-te, altı-da, yedi-de, sekiz-de, dokuz-da
const ONES = ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'];
// onlar: on-da, yirmi-de, otuz-da, kırk-ta, elli-de
const TENS = ['da', 'da', 'de', 'da', 'ta', 'de'];

function locativeForNumber(n: number): string {
  if (n === 0) return 'da'; // sıfır-da
  const ones = n % 10;
  return ones !== 0 ? ONES[ones] : TENS[Math.floor(n / 10)];
}

/**
 * Saate bulunma ekini ekler: "21:30" → "21:30'da", "20:00" → "20:00'de", "13:00" → "13:00'te".
 * Dakika 00 ise saat, değilse dakika okunur ("yirmi bir otuz-da").
 */
export function timeWithLocative(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${time}'${locativeForNumber(minute === 0 ? hour : minute)}`;
}

/**
 * Türkçe küçük harf: I → ı, İ → i. ("İSTANBUL" → "istanbul", "IŞIK" → "ışık")
 * JavaScript'in toLowerCase'i "İ"yi "i̇" (noktalı birleşik karakter) yapar; bu yüzden önce biz çeviriyoruz.
 */
export function toTurkishLower(text: string): string {
  return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/** Cümle başı büyük harf, Türkçe kurala göre: "istanbul" → "İstanbul". */
export function capitalizeTurkish(text: string): string {
  return text ? toTurkishUpper(text[0]) + text.slice(1) : text;
}
