/**
 * İçerik kütüphanesinin ürün kurallarına uyduğunu doğrular. Yeni bir yol ya da
 * gün eklendiğinde bu testler içerik editörünün kontrol listesidir.
 */
import { TRACK_LIST } from '@/content/library';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// Kalıplar küçük harf; metin Türkçe kurallarla küçültülerek karşılaştırılır (/i bayrağı "İ"yi "i" saymaz).
const BANNED = [/inanırsan başarırsın/, /serini kaybedeceksin/, /milyoner/, /tembel/, /bahane(n)? yok/];

describe.each(TRACK_LIST.map((t) => [t.id, t] as const))('yol: %s', (_id, track) => {
  it('kimlik cümlesi ve tanıtım alanları dolu', () => {
    expect(track.templateTitle).toBeTruthy();
    expect(track.pillarTitle).toBeTruthy();
    expect(track.identityPhrase).toBeTruthy();
    expect(track.whyPlaceholder).toBeTruthy();
    expect(track.weeks).toHaveLength(4);
  });

  it('kurulum için anahtar kelimeler ve somut bir seviye sorusu var', () => {
    expect(track.keywords.length).toBeGreaterThanOrEqual(5);
    for (const k of track.keywords) expect(k).toMatch(/^[a-zçğıöşüâîû]+\*?$/);
    expect(track.levelQuestion.question.trim().endsWith('?')).toBe(true);
    expect(track.levelQuestion.options).toHaveLength(3);
  });

  it('günler 1den başlayıp boşluksuz ilerliyor', () => {
    expect(track.days.map((d) => d.day)).toEqual(track.days.map((_, i) => i + 1));
  });

  it.each(track.days.map((d) => [d.day, d] as const))('gün %i kurallara uyuyor', (_day, d) => {
    // Her öğren kartı bir eyleme bağlanır; eylem en fazla 15 dakika ve kötü gün versiyonu var.
    expect(d.learn.title && d.learn.body).toBeTruthy();
    expect(d.do.action && d.do.fallback).toBeTruthy();
    expect(d.do.minutes).toBeGreaterThan(0);
    expect(d.do.minutes).toBeLessThanOrEqual(15);
    expect(d.do.suggestedTime).toMatch(TIME);
    expect(d.reflect.question.trim().endsWith('?')).toBe(true);

    // Öğren kartı tek fikir: 150 kelimeyi aşmaz. İlham kartı kısa kalır.
    expect(d.learn.body.split(/\s+/).length).toBeLessThanOrEqual(150);
    if (d.inspire) expect(d.inspire.body.split(/\s+/).length).toBeLessThanOrEqual(60);

    const text = JSON.stringify(d).toLocaleLowerCase('tr-TR');
    for (const pattern of BANNED) expect(text).not.toMatch(pattern);
  });
});
