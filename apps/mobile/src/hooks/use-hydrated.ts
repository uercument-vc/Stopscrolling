import { useSyncExternalStore } from 'react';

import { useAppStore } from '@/store/app-store';

/** Kalıcı durum cihaz deposundan okunana kadar false döner. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}
