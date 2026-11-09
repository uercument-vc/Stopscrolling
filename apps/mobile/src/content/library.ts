/**
 * Yol Kütüphanesi: repo kökündeki content/tracks altındaki JSON dosyaları.
 * Uygulama içeriği paketle birlikte taşır, bu yüzden çevrimdışı da çalışır.
 * Kişiselleştirme servisi bağlandığında bu içerik "temel doz" olarak kullanılır.
 */
import hareket from '@content/tracks/hareket-eden-biri.json';
import odak from '@content/tracks/odaklanan-biri.json';
import okuma from '@content/tracks/okuyan-biri.json';
import uretim from '@content/tracks/ureten-biri.json';
import yazilim from '@content/tracks/yazilim-ogrenen-biri.json';

import type { Track } from '@/domain/types';

/** Onboarding'de gösterilme sırası. */
export const TRACK_LIST: Track[] = [okuma, hareket, uretim, yazilim, odak] as Track[];

export const TRACKS: Record<string, Track> = Object.fromEntries(TRACK_LIST.map((t) => [t.id, t]));

/** Bir yolun toplam planlanan gün sayısı (4 hafta). Yazılmış gün sayısı bundan az olabilir. */
export const PLANNED_TRACK_DAYS = 28;
