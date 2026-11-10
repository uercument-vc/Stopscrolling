import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Heading, Label, Muted, Row, Surface, Title } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import {
  COMPARISON,
  DAY_STEPS,
  EXPECTATION_NOTE,
  EXPECTATIONS,
  FEED_EXAMPLES,
  OUR_ASK,
  PROMISES,
  TUTORIAL_PAGES,
  type TutorialVisual,
} from '@/content/tutorial';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tanıtım: Kullanıcı neden bu uygulamayı kullanmalı, kullandığında ne olacak?
 * Onboarding'in ilk adımı; Tarif ekranından tekrar açılabilir. Her sayfadan atlanabilir.
 */
export function Tutorial({
  onDone,
  doneLabel = 'Başlayalım',
  page: controlledPage,
  onPageChange,
}: {
  onDone: () => void;
  doneLabel?: string;
  /** Dışarıdan kontrol edilirse geri dönüldüğünde kalınan sayfa korunur. */
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const theme = useTheme();
  const [localPage, setLocalPage] = useState(0);
  const page = controlledPage ?? localPage;
  const setPage = (next: number) => (onPageChange ? onPageChange(next) : setLocalPage(next));

  const current = TUTORIAL_PAGES[page];
  const isLast = page === TUTORIAL_PAGES.length - 1;

  return (
    <View style={styles.wrap}>
      <Row style={[styles.spread, styles.header]}>
        <View style={styles.dots} accessibilityLabel={`Sayfa ${page + 1} / ${TUTORIAL_PAGES.length}`}>
          {TUTORIAL_PAGES.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.dot,
                { backgroundColor: i === page ? theme.accent : theme.border },
                i === page && styles.dotActive,
              ]}
            />
          ))}
        </View>
        {!isLast && <Button small variant="ghost" label="Atla" onPress={onDone} />}
      </Row>

      <View style={styles.text}>
        <Label>{current.kicker}</Label>
        <Title style={styles.title}>{current.title}</Title>
        {current.body.map((paragraph) => (
          <Body key={paragraph}>{paragraph}</Body>
        ))}
      </View>

      <Visual id={current.id} />

      <Row style={styles.spread}>
        <Button variant="ghost" label="Geri" disabled={page === 0} onPress={() => setPage(page - 1)} />
        <Button
          label={isLast ? doneLabel : 'Devam'}
          onPress={() => (isLast ? onDone() : setPage(page + 1))}
          style={styles.next}
        />
      </Row>
    </View>
  );
}

function Visual({ id }: { id: TutorialVisual }) {
  switch (id) {
    case 'akis':
      return <FeedVisual />;
    case 'karsilastirma':
      return <ComparisonVisual />;
    case 'gun':
      return <Timeline items={DAY_STEPS} />;
    case 'beklenti':
      return <ExpectationVisual />;
    case 'soz':
      return <PromiseVisual />;
  }
}

/** Bitmeyen bir akış: aşağı indikçe solan gönderiler. */
function FeedVisual() {
  const theme = useTheme();
  return (
    <Surface style={styles.feed}>
      {FEED_EXAMPLES.map((item, i) => (
        <View key={item.text} style={[styles.feedRow, { opacity: 1 - i * 0.18 }]}>
          <View style={[styles.thumb, { backgroundColor: theme.surfaceMuted }]} />
          <Text style={[styles.feedText, { color: theme.text }]} numberOfLines={2}>
            {item.text}
          </Text>
          <View style={[styles.tag, { borderColor: item.tag === 'Kaydedildi' ? theme.accent : theme.ilham }]}>
            <Text style={[styles.tagText, { color: item.tag === 'Kaydedildi' ? theme.accent : theme.ilham }]}>
              {item.tag}
            </Text>
          </View>
        </View>
      ))}
      <Muted style={styles.center}>↓ Akış devam ediyor…</Muted>
    </Surface>
  );
}

function ComparisonVisual() {
  const theme = useTheme();
  return (
    <Surface>
      {COMPARISON.map((row) => (
        <View key={row.from} style={styles.compareRow}>
          <Muted style={[styles.compareCell, styles.strike]}>{row.from}</Muted>
          <Text style={[styles.arrow, { color: theme.textSecondary }]}>→</Text>
          <Text style={[styles.compareCell, styles.compareTo, { color: theme.accent }]}>{row.to}</Text>
        </View>
      ))}
    </Surface>
  );
}

function Timeline({ items }: { items: { when: string; what: string }[] }) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item, i) => (
        <View key={item.when} style={styles.timelineRow}>
          <View style={styles.rail}>
            <View style={[styles.railDot, { backgroundColor: theme.accent }]} />
            {i < items.length - 1 && <View style={[styles.railLine, { backgroundColor: theme.border }]} />}
          </View>
          <View style={styles.timelineText}>
            <Heading style={styles.when}>{item.when}</Heading>
            <Body>{item.what}</Body>
          </View>
        </View>
      ))}
    </View>
  );
}

function ExpectationVisual() {
  const theme = useTheme();
  return (
    <View style={styles.stack}>
      <Timeline items={EXPECTATIONS} />
      <View style={[styles.note, { backgroundColor: theme.accentSoft }]}>
        <Body>{EXPECTATION_NOTE}</Body>
      </View>
    </View>
  );
}

function PromiseVisual() {
  const theme = useTheme();
  return (
    <View style={styles.stack}>
      <Surface>
        {PROMISES.map((promise) => (
          <View key={promise} style={styles.promiseRow}>
            <Text style={[styles.check, { color: theme.accent }]}>✓</Text>
            <Body style={styles.flex}>{promise}</Body>
          </View>
        ))}
      </Surface>
      <View style={[styles.note, { backgroundColor: theme.accentSoft }]}>
        <Heading>{OUR_ASK}</Heading>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xl },
  spread: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  // "Atla" son sayfada yok; yükseklik sabit kalsın ki içerik zıplamasın.
  header: { minHeight: 36 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  dotActive: { width: 24 },
  text: { gap: Spacing.md },
  title: { fontSize: 30, lineHeight: 38 },
  next: { flex: 1, marginLeft: Spacing.md },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  stack: { gap: Spacing.lg },
  feed: { gap: Spacing.md },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  thumb: { width: 40, height: 40, borderRadius: Radius.sm },
  feedText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  tag: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  compareCell: { flex: 1 },
  compareTo: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  strike: { textDecorationLine: 'line-through' },
  arrow: { fontSize: 16 },
  timelineRow: { flexDirection: 'row', gap: Spacing.md },
  rail: { width: 14, alignItems: 'center' },
  railDot: { width: 12, height: 12, borderRadius: Radius.pill, marginTop: 6 },
  railLine: { width: 2, flex: 1, marginTop: 4 },
  timelineText: { flex: 1, gap: 2, paddingBottom: Spacing.lg },
  when: { fontSize: 16, lineHeight: 22 },
  note: { borderRadius: Radius.md, padding: Spacing.lg },
  promiseRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  check: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
});
