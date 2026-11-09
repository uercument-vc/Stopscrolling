import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { fromDateKey } from '@/domain/dates';
import type { Action, TimeOfDay } from '@/domain/types';

/**
 * Yerel bildirimler. İlke: Günde en fazla 2 bildirim, saatleri kullanıcı seçer,
 * kayıp korkusuyla çalışan metin yok ("Serini kaybedeceksin!" gibi).
 *
 * Web sürümü notifications.web.ts içinde (boş uygulama).
 */
const enabled = Platform.OS !== 'web';
const DAILY_DOSE_ID = 'gunluk-doz';

if (enabled) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function parseTime(time: TimeOfDay) {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

async function safely(task: () => Promise<unknown>) {
  if (!enabled) return;
  try {
    await task();
  } catch (error) {
    // Bildirim hataları uygulamanın akışını asla bozmamalı.
    console.warn('[bildirim]', error);
  }
}

export const notifications = {
  async requestPermission(): Promise<boolean> {
    if (!enabled) return false;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('varsayilan', {
          name: 'Hatırlatmalar',
          importance: AndroidImportance.DEFAULT,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    } catch {
      return false;
    }
  },

  scheduleDailyDose(time: TimeOfDay) {
    return safely(async () => {
      await Notifications.cancelScheduledNotificationAsync(DAILY_DOSE_ID).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_DOSE_ID,
        content: { title: 'Bugünkü dozun hazır', body: 'Yaklaşık 10 dakika. Sonra hayatına dön.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...parseTime(time) },
      });
    });
  },

  scheduleAction(action: Action) {
    if (!action.time) return Promise.resolve();
    const { hour, minute } = parseTime(action.time);
    const date = fromDateKey(action.plannedFor);
    date.setHours(hour, minute, 0, 0);
    if (date.getTime() <= Date.now()) return Promise.resolve();
    return safely(() =>
      Notifications.scheduleNotificationAsync({
        identifier: action.id,
        content: { title: 'Planladığın adım', body: action.title },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      }),
    );
  },

  cancelAction(actionId: string) {
    return safely(() => Notifications.cancelScheduledNotificationAsync(actionId));
  },

  cancelAll() {
    return safely(() => Notifications.cancelAllScheduledNotificationsAsync());
  },
};
