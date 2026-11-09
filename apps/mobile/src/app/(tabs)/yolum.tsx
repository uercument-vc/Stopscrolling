import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Heading, Label, Muted, ProgressBar, Row, Screen, Section, Surface, Title } from '@/components/ui';
import { WeekStrip } from '@/components/week-strip';
import { Radius, Spacing } from '@/constants/theme';
import { PLANNED_TRACK_DAYS, TRACKS } from '@/content/library';
import { summarizeWeek, weeklySuggestion } from '@/domain/metrics';
import { weightPercents } from '@/domain/recipe';
import type { Level } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { useAppStore } from '@/store/app-store';

const LEVEL_LABELS: Record<Level, string> = { baslangic: 'Başlangıç', orta: 'Orta', ileri: 'İleri' };

export default function PathScreen() {
  const theme = useTheme();
  const today = useToday();
  const state = useAppStore();
  const { identity, pillars, recipe, doses, actions, dismissedSuggestions, baselineSocialHours } = state;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(identity);

  const week = useMemo(
    () => summarizeWeek(today, Object.values(doses), actions, pillars),
    [today, doses, actions, pillars],
  );
  const suggestion = weeklySuggestion(week, recipe, pillars, dismissedSuggestions);
  const percents = weightPercents(recipe.weights);

  return (
    <Screen>
      <Title>Yolum</Title>

      <Surface>
        <Label>Kimliğin</Label>
        {editing ? (
          <>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
            />
            <Row>
              <Button
                small
                label="Kaydet"
                disabled={!draft.trim()}
                onPress={() => {
                  state.setIdentity(draft.trim());
                  setEditing(false);
                }}
              />
              <Button small variant="ghost" label="Vazgeç" onPress={() => setEditing(false)} />
            </Row>
          </>
        ) : (
          <>
            <Heading>{identity}</Heading>
            <Button
              small
              variant="ghost"
              label="Düzenle"
              style={styles.left}
              onPress={() => {
                setDraft(identity);
                setEditing(true);
              }}
            />
          </>
        )}
      </Surface>

      <Section title="Bu hafta">
        <WeekStrip summary={week} today={today} />
        {pillars.map((p) => {
          const stats = week.perPillar[p.id];
          return (
            <Row key={p.id} style={styles.spread}>
              <Body>{p.title}</Body>
              <Muted>
                {stats?.done ?? 0}/{stats?.planned ?? 0} eylem yapıldı
              </Muted>
            </Row>
          );
        })}
      </Section>

      {suggestion && (
        <Surface style={{ borderColor: theme.accent }}>
          <Label>Haftalık ayar önerisi</Label>
          <Body>{suggestion.text}</Body>
          <Muted>Sistem tarifini kendi başına değiştirmez. Onaylarsan uygulanır ve değişiklik geçmişine yazılır.</Muted>
          <Row>
            <Button
              small
              label="Onayla"
              onPress={() => {
                const { version: _ignored, ...next } = suggestion.apply(recipe);
                state.updateRecipe(next, 'oneri', today);
                state.dismissSuggestion(suggestion.id);
              }}
            />
            <Button small variant="ghost" label="Böyle kalsın" onPress={() => state.dismissSuggestion(suggestion.id)} />
          </Row>
        </Surface>
      )}

      <Section title="Sütunların">
        {pillars.map((p) => {
          const track = TRACKS[p.trackId];
          const completed = p.currentDay - 1;
          const currentWeek = Math.min(4, Math.ceil(p.currentDay / 7));
          return (
            <Surface key={p.id}>
              <Row style={styles.spread}>
                <Heading>{p.title}</Heading>
                <Muted>{percents[p.id] ? `%${percents[p.id]}` : 'Duraklatıldı'}</Muted>
              </Row>
              <Muted>
                {LEVEL_LABELS[p.level]} · {completed}/{PLANNED_TRACK_DAYS} gün tamamlandı
              </Muted>
              <ProgressBar value={completed / PLANNED_TRACK_DAYS} />
              {p.why ? <Body style={styles.why}>“{p.why}”</Body> : null}
              <View style={styles.weeks}>
                {track.weeks.map((w) => {
                  const available = track.days.some((d) => Math.ceil(d.day / 7) === w.week);
                  const isCurrent = w.week === currentWeek;
                  return (
                    <View
                      key={w.week}
                      style={[
                        styles.week,
                        { borderColor: isCurrent ? theme.accent : theme.border },
                        isCurrent && { backgroundColor: theme.accentSoft },
                      ]}>
                      <Body style={!available && { color: theme.textSecondary }}>
                        {w.week}. hafta · {w.theme}
                      </Body>
                      {!available && <Muted>Hazırlanıyor</Muted>}
                    </View>
                  );
                })}
              </View>
              {track.status !== 'live' && (
                <Muted style={styles.small}>Taslak içerik: Yayından önce insan gözünden geçecek.</Muted>
              )}
            </Surface>
          );
        })}
      </Section>

      {baselineSocialHours ? (
        <Section title="Başlangıç noktan">
          <Muted>
            Başladığında günde {baselineSocialHours.toLocaleLowerCase('tr-TR')} sosyal medyada olduğunu söylemiştin. Bir
            ay sonra tekrar bakacağız.
          </Muted>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spread: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 18, minHeight: 80 },
  why: { fontStyle: 'italic' },
  weeks: { gap: Spacing.sm },
  week: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 2 },
  small: { fontSize: 12 },
});
