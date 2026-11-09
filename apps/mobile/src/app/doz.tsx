import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionRow } from '@/components/action-row';
import {
  Body,
  Button,
  Chip,
  Heading,
  Label,
  Muted,
  ProgressBar,
  Row,
  Screen,
  Surface,
  Title,
  TypeBadge,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { TRACKS } from '@/content/library';
import { canShelve, MAX_SHELF, SHELF_OPTIONS, shelfItems, todayActions } from '@/domain/actions';
import { COPY } from '@/domain/copy';
import { addDays } from '@/domain/dates';
import { timeWithLocative } from '@/domain/turkce';
import type { DoseCard, Feedback } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { useAppStore } from '@/store/app-store';

const FEEDBACK: { value: Feedback; label: string }[] = [
  { value: 'ise_yaradi', label: 'İşe yaradı' },
  { value: 'cok_kolay', label: 'Çok kolay' },
  { value: 'cok_zor', label: 'Çok zor' },
  { value: 'zaten_biliyorum', label: 'Zaten biliyorum' },
];

const TIME_OPTIONS = ['07:30', '12:30', '18:00', '20:00', '21:30', '22:30'];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function DoseScreen() {
  const today = useToday();
  const dose = useAppStore((s) => s.doses[today]);
  const ensureDose = useAppStore((s) => s.ensureDose);
  const setDoseIndex = useAppStore((s) => s.setDoseIndex);
  const finishDose = useAppStore((s) => s.finishDose);

  useEffect(() => {
    ensureDose(today);
  }, [today, ensureDose]);

  if (!dose) return null;
  if (dose.status === 'bitti') return <FinishView />;

  const index = Math.min(dose.currentIndex, dose.cards.length - 1);
  const card = dose.cards[index];
  const isLast = index === dose.cards.length - 1;
  const needsDecision = (card.type === 'uygula' || card.type === 'tekrar') && !card.decision;

  const goNext = () => {
    if (isLast) finishDose(today);
    else setDoseIndex(today, index + 1);
  };

  return (
    <Screen withTabBar={false}>
      <View style={styles.header}>
        <Row style={styles.spread}>
          <Muted>
            {index + 1} / {dose.cards.length}
          </Muted>
          <Button small variant="ghost" label="Kapat" onPress={close} />
        </Row>
        <ProgressBar value={(index + 1) / dose.cards.length} />
      </View>

      <CardView key={card.id} card={card} />

      <Row style={styles.spread}>
        <Button
          variant="ghost"
          label="Önceki"
          disabled={index === 0}
          onPress={() => setDoseIndex(today, index - 1)}
        />
        <Button
          label={isLast ? 'Dozu bitir' : 'Sonraki'}
          disabled={needsDecision}
          onPress={goNext}
          style={styles.next}
        />
      </Row>
      {needsDecision && <Muted style={styles.center}>Devam etmek için bu adım hakkında bir karar ver.</Muted>}
    </Screen>
  );
}

function CardView({ card }: { card: DoseCard }) {
  const theme = useTheme();
  const today = useToday();
  const [showWhy, setShowWhy] = useState(false);
  const setFeedback = useAppStore((s) => s.setFeedback);
  const setAnswer = useAppStore((s) => s.setAnswer);
  const pillarTitle = TRACKS[card.pillarId]?.pillarTitle;

  return (
    <Surface style={styles.card}>
      <Row style={styles.spread}>
        <TypeBadge type={card.type} />
        <Muted>{pillarTitle}</Muted>
      </Row>

      {card.title && <Title>{card.title}</Title>}
      <Body style={card.type === 'yansit' || card.type === 'ilham' ? styles.large : undefined}>{card.body}</Body>
      {card.source && <Muted style={styles.source}>Kaynak: {card.source}</Muted>}

      {(card.type === 'uygula' || card.type === 'tekrar') && <ActionDecision card={card} />}

      {card.type === 'yansit' && (
        <TextInput
          defaultValue={card.answer}
          onChangeText={(text) => setAnswer(today, card.id, text)}
          placeholder="Tek satır yeterli (isteğe bağlı)"
          placeholderTextColor={theme.textSecondary}
          maxLength={280}
          multiline
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
        />
      )}

      {(card.type === 'ogren' || card.type === 'ilham') && (
        <Row>
          {FEEDBACK.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={card.feedback === f.value}
              onPress={() => setFeedback(today, card.id, card.feedback === f.value ? undefined : f.value)}
            />
          ))}
        </Row>
      )}

      <Pressable onPress={() => setShowWhy((v) => !v)} accessibilityRole="button">
        <Muted style={{ color: theme.accent }}>{showWhy ? 'Gizle' : 'Bunu neden görüyorum?'}</Muted>
      </Pressable>
      {showWhy && (
        <View style={[styles.why, { backgroundColor: theme.surfaceMuted }]}>
          <Muted>{card.why}</Muted>
        </View>
      )}
    </Surface>
  );
}

/**
 * Uygula kartı: "Kaydet" yok. Ya bugün planlarsın, ya küçük versiyonunu seçersin,
 * ya tarihli olarak rafa koyarsın (en fazla 7), ya da bugün geçersin.
 */
function ActionDecision({ card }: { card: DoseCard }) {
  const theme = useTheme();
  const today = useToday();
  const tone = useAppStore((s) => s.recipe.tone);
  const actions = useAppStore((s) => s.actions);
  const planAction = useAppStore((s) => s.planAction);
  const shelveAction = useAppStore((s) => s.shelveAction);
  const skipAction = useAppStore((s) => s.skipAction);
  const action = card.action!;

  const [time, setTime] = useState(action.suggestedTime);
  const [changingTime, setChangingTime] = useState(false);
  const [notToday, setNotToday] = useState(card.decision === 'rafa' || card.decision === 'gecildi');

  const shelfFull = !canShelve(actions.filter((a) => a.cardId !== card.id));
  const planned = actions.find((a) => a.cardId === card.id);

  const confirmation: Record<NonNullable<DoseCard['decision']>, string> = {
    planlandi: `Bugün ${planned?.time ?? time} için planlandı.`,
    kucuk: `${COPY[tone].smallChosen} Bugün ${planned?.time ?? time} için planlandı.`,
    rafa: `Rafa kondu. Tarihi gelince Bugün ekranında göreceksin.`,
    gecildi: COPY[tone].skipped,
  };

  return (
    <View style={[styles.decision, { borderColor: theme.border }]}>
      <Label>Eylem</Label>
      <Heading>{action.title}</Heading>
      <Muted>
        ~{action.minutes} dk · Kötü gün versiyonu: {action.fallback}
      </Muted>

      {changingTime ? (
        <Row>
          {[...new Set([action.suggestedTime, ...TIME_OPTIONS])].map((t) => (
            <Chip
              key={t}
              label={t}
              selected={time === t}
              onPress={() => {
                setTime(t);
                setChangingTime(false);
              }}
            />
          ))}
        </Row>
      ) : (
        <Pressable onPress={() => setChangingTime(true)} accessibilityRole="button">
          <Muted style={{ color: theme.accent }}>Saat: {time} · değiştir</Muted>
        </Pressable>
      )}

      <Button
        label={`Bugün ${timeWithLocative(time)} yapacağım`}
        variant={card.decision === 'planlandi' ? 'primary' : 'secondary'}
        onPress={() => {
          setNotToday(false);
          planAction(today, card.id, { time, small: false });
        }}
      />
      <Button
        label="Küçük versiyonu yapacağım"
        variant={card.decision === 'kucuk' ? 'primary' : 'secondary'}
        onPress={() => {
          setNotToday(false);
          planAction(today, card.id, { time, small: true });
        }}
      />
      <Button
        label="Bugün değil"
        variant={notToday ? 'primary' : 'ghost'}
        onPress={() => setNotToday(true)}
      />

      {notToday && (
        <View style={styles.notToday}>
          <Muted>
            Rafa koy (tarih zorunlu, raf en fazla {MAX_SHELF} öğe alır · şu an{' '}
            {shelfItems(actions).length}/{MAX_SHELF}):
          </Muted>
          <Row>
            {SHELF_OPTIONS.map((o) => (
              <Chip
                key={o.days}
                label={o.label}
                selected={planned?.status === 'rafta' && planned.plannedFor === addDays(today, o.days)}
                onPress={() => !shelfFull && shelveAction(today, card.id, o.days)}
              />
            ))}
          </Row>
          {shelfFull && <Muted style={{ color: theme.danger }}>Rafın dolu. Önce raftan birini yap ya da bırak.</Muted>}
          <Button small variant="ghost" label="Rafa koymadan geç" onPress={() => skipAction(today, card.id)} />
        </View>
      )}

      {card.decision && <Body style={{ color: theme.accent }}>{confirmation[card.decision]}</Body>}
    </View>
  );
}

function FinishView() {
  const today = useToday();
  const tone = useAppStore((s) => s.recipe.tone);
  const doseTime = useAppStore((s) => s.recipe.doseTime);
  const actions = useAppStore((s) => s.actions);
  const planned = todayActions(actions, today);

  return (
    <Screen withTabBar={false}>
      <View style={styles.finish}>
        <Title style={styles.finishTitle}>{COPY[tone].finishTitle}</Title>
        <Body>{COPY[tone].finishBody}</Body>
      </View>

      <View style={styles.finishList}>
        <Label>Bugünkü eylemlerin ({planned.length})</Label>
        {planned.length === 0 ? (
          <Muted>Bugün için eylem seçmedin. Bu da olur.</Muted>
        ) : (
          planned.map((a) => <ActionRow key={a.id} action={a} today={today} mode="ozet" />)
        )}
      </View>

      <Muted style={styles.center}>Yarınki doz {timeWithLocative(doseTime)} hazır olacak.</Muted>
      <Button label="Kapat" onPress={close} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.sm },
  spread: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  next: { flex: 1, marginLeft: Spacing.md },
  card: { gap: Spacing.lg, padding: Spacing.xl },
  large: { fontSize: 19, lineHeight: 28 },
  source: { fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  why: { borderRadius: Radius.md, padding: Spacing.md },
  decision: { gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.lg },
  notToday: { gap: Spacing.sm },
  center: { textAlign: 'center' },
  finish: { gap: Spacing.md, paddingTop: Spacing.xxl * 2 },
  finishTitle: { fontSize: 34, lineHeight: 42 },
  finishList: { gap: Spacing.md },
});
