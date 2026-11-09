import type { Action, TimeOfDay } from '@/domain/types';

/** Web'de yerel bildirim yok; native sürümle aynı arayüz, hiçbir şey yapmaz. */
export const notifications = {
  requestPermission: async (): Promise<boolean> => false,
  scheduleDailyDose: async (_time: TimeOfDay) => {},
  scheduleAction: async (_action: Action) => {},
  cancelAction: async (_actionId: string) => {},
  cancelAll: async () => {},
};
