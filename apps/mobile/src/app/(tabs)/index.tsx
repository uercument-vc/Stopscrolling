import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { ActionRow, EmptyState } from '@/components/action-row';
import { Body, Button, Heading, Label, Muted, ProgressBar, Screen, Section, Surface } from '@/components/ui';
import { WeekStrip } from '@/components/week-strip';
import { Spacing } from '@/constants/theme';
import { TRACKS } from '@/content/library';
import { pendingActions, todayActions } from '@/domain/actions';
import { COPY } from '@/domain/copy';
import { formatLongDate } from '@/domain/dates';
import { estimateMinutes } from '@/domain/dose-builder';
import { summarizeWeek } from '@/domain/metrics';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { useAppStore } from '@/store/app-store';

export default function TodayScreen() {
  const theme = useTheme();
  const today = useToday();
  const identity = useAppStore((s) => s.identity);
  const dose = useAppStore((s) => s.doses[today]);
  const doses = useAppStore((s) => s.doses);
  const actions = useAppStore((s) => s.actions);
  const pillars = useAppStore((s) => s.pillars);
  const tone = useAppStore((s) => s.recipe.tone);
  const ensureDose = useAppStore((s) => s.ensureDose);
  const shiftDevDay = useAppStore((s) => s.shiftDevDay);
  const devDayOffset = useAppStore((s) => s.devDayOffset);

  useEffect(() => {
    ensureDose(today);
  }, [today, ensureDose]);

  const dueToday = useMemo(() => {
    const open = todayActions(actions, today);
    const resolvedToday = actions.filter(
      (a) => a.plannedFor === today && a.resolvedOn === today && a.status !== 'birakildi',
    );
    return [...open, ...resolvedToday.filter((a) => !open.includes(a))];
  }, [actions, today]);
  const pending = useMemo(() => pendingActions(actions, today), [actions, today]);
  const week = useMemo(
    () => summarizeWeek(today, Object.values(doses), actions, pillars),
    [today, doses, actions, pillars],
  );

  const doseTitles = dose
    ? [...new Set(dose.cards.map((c) => TRACKS[c.pillarId]?.pillarTitle).filter(Boolean))].join(' · ')
    : '';

  return (
    <Screen>
      <Section title={formatLongDate(today)}>
        <Body style={[styles.identity, { color: theme.textSecondary }]}>{identity}</Body>
      </Section>

      {dose && (
        <Surface style={dose.status === 'bitti' ? undefined : { borderColor: theme.accent }}>
          {dose.status === 'bitti' ? (
            <>
              <Heading>{COPY[tone].finishTitle} ✓</Heading>
              <Muted>Yarınki doz sabah hazır olacak. {COPY[tone].finishBody}</Muted>
            </>
          ) : (
            <>
              <Label>{dose.status === 'basladi' ? 'Dozun yarıda' : 'Bugünkü dozun hazır'}</Label>
              <Heading>
                {dose.cards.length} kart · yaklaşık {estimateMinutes(dose.cards)} dk
              </Heading>
              <Muted>{doseTitles}</Muted>
              {dose.status === 'basladi' && <ProgressBar value={dose.currentIndex / dose.cards.length} />}
              <Button
                label={dose.status === 'basladi' ? 'Devam et' : 'Başla'}
                onPress={() => router.push('/doz')}
              />
            </>
          )}
        </Surface>
      )}

      <Section title={COPY[tone].checkinPrompt}>
        {dueToday.length === 0 ? (
          <EmptyState text="Bugün için planlanmış eylem yok. Dozdaki uygula kartlarından eylem seçebilirsin." />
        ) : (
          dueToday.map((a) => <ActionRow key={a.id} action={a} today={today} mode="bugun" />)
        )}
      </Section>

      {pending.length > 0 && (
        <Section title="Önceki günlerden kalanlar">
          <Muted>Olur, bazen plan tutmaz. Yaptıysan işaretle, yapmadıysan bugüne al ya da bırak.</Muted>
          {pending.map((a) => (
            <ActionRow key={a.id} action={a} today={today} mode="bekleyen" />
          ))}
        </Section>
      )}

      <Section title="Bu hafta">
        <WeekStrip summary={week} today={today} />
      </Section>

      {__DEV__ && (
        <Surface style={styles.dev}>
          <Label>Geliştirici</Label>
          <Muted>
            Döngüyü birkaç gün boyunca denemek için takvimi ileri sar. Şu an: {devDayOffset > 0 ? `+${devDayOffset} gün` : 'gerçek tarih'}
          </Muted>
          <Button small variant="secondary" label="Sonraki güne geç" onPress={() => shiftDevDay(1)} />
        </Surface>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { fontStyle: 'italic' },
  dev: { gap: Spacing.sm, opacity: 0.8 },
});
