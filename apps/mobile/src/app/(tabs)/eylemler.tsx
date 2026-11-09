import { useMemo } from 'react';

import { ActionRow, EmptyState } from '@/components/action-row';
import { Muted, Screen, Section, Title } from '@/components/ui';
import { completedActions, MAX_SHELF, pendingActions, shelfItems, todayActions, upcomingShelf } from '@/domain/actions';
import { useToday } from '@/hooks/use-today';
import { useAppStore } from '@/store/app-store';

export default function ActionsScreen() {
  const today = useToday();
  const actions = useAppStore((s) => s.actions);

  const lists = useMemo(
    () => ({
      today: todayActions(actions, today),
      pending: pendingActions(actions, today),
      shelf: upcomingShelf(actions, today),
      shelfCount: shelfItems(actions).length,
      done: completedActions(actions),
    }),
    [actions, today],
  );

  return (
    <Screen>
      <Title>Eylemler</Title>

      <Section title="Bugün">
        {lists.today.length === 0 ? (
          <EmptyState text="Bugün için açık eylem yok." />
        ) : (
          lists.today.map((a) => <ActionRow key={a.id} action={a} today={today} mode="bugun" />)
        )}
      </Section>

      {lists.pending.length > 0 && (
        <Section title="Önceki günlerden kalanlar">
          {lists.pending.map((a) => (
            <ActionRow key={a.id} action={a} today={today} mode="bekleyen" />
          ))}
        </Section>
      )}

      <Section title={`Raf · ${lists.shelfCount}/${MAX_SHELF}`}>
        <Muted>
          Kaydetmek, yapmış gibi hissettirir. Bu yüzden raf küçük ve her öğenin bir tarihi var. Tarihi gelen öğe Bugün
          listesine düşer.
        </Muted>
        {lists.shelf.length === 0 ? (
          <EmptyState text="Raf boş." />
        ) : (
          lists.shelf.map((a) => <ActionRow key={a.id} action={a} today={today} mode="raf" />)
        )}
      </Section>

      <Section title="Yaptıkların">
        {lists.done.length === 0 ? (
          <EmptyState text="Yaptığın eylemler burada birikecek. Kıyas sadece dünkü seninle." />
        ) : (
          lists.done.map((a) => <ActionRow key={a.id} action={a} today={today} mode="tamamlanan" />)
        )}
      </Section>
    </Screen>
  );
}
