import { StyleSheet, Text, View } from 'react-native';

import { Muted } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { WEEKDAY_INITIALS } from '@/domain/dates';
import { WEEKLY_DOSE_TARGET, type WeekSummary } from '@/domain/metrics';
import type { DateKey } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

/**
 * Haftalık ritim: Açık daire = doz bitti, koyu daire = anlamlı gün (doz + en az bir eylem).
 * Kırık seri, kırmızı uyarı yok; sadece kendinle kıyas.
 */
export function WeekStrip({ summary, today }: { summary: WeekSummary; today: DateKey }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {summary.days.map((day, i) => {
          const isToday = day.date === today;
          return (
            <View key={day.date} style={styles.day}>
              <Text style={[styles.initial, { color: isToday ? theme.text : theme.textSecondary }]}>
                {WEEKDAY_INITIALS[i]}
              </Text>
              <View
                accessibilityLabel={`${WEEKDAY_INITIALS[i]}: ${day.meaningful ? 'anlamlı gün' : day.doseFinished ? 'doz bitti' : 'boş'}`}
                style={[
                  styles.dot,
                  { borderColor: day.doseFinished ? theme.accent : theme.border },
                  day.doseFinished && { backgroundColor: day.meaningful ? theme.accent : theme.accentSoft },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Muted>
        Bu hafta {summary.doseDays}/{WEEKLY_DOSE_TARGET} gün doz · {summary.meaningfulDays} anlamlı gün ·{' '}
        {summary.actionsDone} eylem
      </Muted>
      <Muted style={styles.legend}>Açık: doz bitti · Koyu: doz + en az bir eylem (anlamlı gün)</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: Spacing.xs, flex: 1 },
  initial: { fontSize: 12, fontWeight: '600' },
  dot: { width: 22, height: 22, borderRadius: Radius.pill, borderWidth: 2 },
  legend: { fontSize: 12 },
});
