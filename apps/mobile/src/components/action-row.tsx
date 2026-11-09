import { StyleSheet, View } from 'react-native';

import { Body, Button, Muted, Row, Surface } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { TRACKS } from '@/content/library';
import { formatRelativeDay } from '@/domain/dates';
import type { Action, DateKey } from '@/domain/types';
import { useAppStore } from '@/store/app-store';

const STATUS_LABELS: Partial<Record<Action['status'], string>> = {
  yapildi: '✓ Yapıldı',
  kismen: '✓ Kısmen yapıldı',
  yapilmadi: 'Bugün olmadı. Sorun değil.',
  birakildi: 'Bırakıldı',
};

/** ozet: sadece bilgi, buton yok (doz bitiş ekranı). */
export type ActionRowMode = 'bugun' | 'bekleyen' | 'raf' | 'tamamlanan' | 'ozet';

export function ActionRow({ action, today, mode }: { action: Action; today: DateKey; mode: ActionRowMode }) {
  const resolveAction = useAppStore((s) => s.resolveAction);
  const moveToToday = useAppStore((s) => s.moveToToday);

  const meta = [
    TRACKS[action.pillarId]?.pillarTitle,
    mode === 'raf' || mode === 'bekleyen' || mode === 'tamamlanan'
      ? formatRelativeDay(mode === 'tamamlanan' ? (action.resolvedOn ?? action.plannedFor) : action.plannedFor, today)
      : action.time,
    `~${action.minutes} dk`,
    action.small ? 'küçük versiyon' : undefined,
    action.status === 'rafta' && mode === 'bugun' ? 'raftan' : undefined,
  ].filter(Boolean);

  const resolved = STATUS_LABELS[action.status];
  const open = action.status === 'planli' || action.status === 'rafta';

  return (
    <Surface style={styles.card}>
      <Body>{action.title}</Body>
      <Muted>{meta.join(' · ')}</Muted>

      {mode === 'bugun' && open && (
        <Row>
          <Button small label="Yaptım" onPress={() => resolveAction(action.id, 'yapildi', today)} />
          <Button small variant="secondary" label="Kısmen" onPress={() => resolveAction(action.id, 'kismen', today)} />
          <Button small variant="ghost" label="Olmadı" onPress={() => resolveAction(action.id, 'yapilmadi', today)} />
        </Row>
      )}

      {mode === 'bekleyen' && (
        <Row>
          <Button small label="Yaptım" onPress={() => resolveAction(action.id, 'yapildi', today)} />
          <Button small variant="secondary" label="Bugüne al" onPress={() => moveToToday(action.id, today)} />
          <Button small variant="ghost" label="Bırak" onPress={() => resolveAction(action.id, 'birakildi', today)} />
        </Row>
      )}

      {mode === 'raf' && (
        <Row>
          <Button small variant="secondary" label="Bugüne al" onPress={() => moveToToday(action.id, today)} />
          <Button small variant="ghost" label="Bırak" onPress={() => resolveAction(action.id, 'birakildi', today)} />
        </Row>
      )}

      {!open && resolved && mode !== 'tamamlanan' && mode !== 'ozet' && <Muted>{resolved}</Muted>}
    </Surface>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Muted>{text}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  empty: { paddingVertical: Spacing.sm },
});
