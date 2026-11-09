import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { addDays, toDateKey } from '@/domain/dates';
import type { DateKey } from '@/domain/types';
import { useAppStore } from '@/store/app-store';

/**
 * Bugünün tarihi. Uygulama öne geldiğinde ve dakikada bir yenilenir; gece
 * yarısı geçince yeni günün dozu kurulur. Geliştirme modunda takvim ileri sarılabilir.
 */
export function useToday(): DateKey {
  const offset = useAppStore((s) => (__DEV__ ? s.devDayOffset : 0));
  const [real, setReal] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const refresh = () => setReal(toDateKey(new Date()));
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  return offset ? addDays(real, offset) : real;
}
