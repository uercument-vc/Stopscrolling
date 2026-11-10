import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Heading, Label, Muted, ProgressBar, Row, Screen, Section, Surface, Title } from '@/components/ui';
import { WeekStrip } from '@/components/week-strip';
import { Radius, Spacing } from '@/constants/theme';
import { PLANNED_TRACK_DAYS, TRACKS, TRAITS } from '@/content/library';
import { summarizeWeek, weeklySuggestion } from '@/domain/metrics';
import { motivationPhrase, PRODUCTIVE_TIMES } from '@/domain/profile';
import { toTurkishLower } from '@/domain/turkce';
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
  const { identity, pillars, recipe, doses, actions, dismissedSuggestions, profile } = state;
  const baselineSocialHours = profile.baselineSocialHours;
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

      <ProfileSection />

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
              {p.motivatedBy?.length ? (
                <Muted style={{ color: theme.accent }}>{motivationPhrase(p.motivatedBy)}</Muted>
              ) : null}
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
            Başladığında günde {toTurkishLower(baselineSocialHours)} sosyal medyada olduğunu söylemiştin. Bir
            ay sonra tekrar bakacağız.
          </Muted>
        </Section>
      ) : null}
    </Screen>
  );
}

/**
 * "Seni nasıl tanıyoruz?": Sistemin kullanıcı hakkında bildiği her şey ve nerede kullanıldığı.
 * Gizli profil yok; algoritma gibi kullanıcının tanımı da görünür.
 */
function ProfileSection() {
  const profile = useAppStore((s) => s.profile);
  const traitLabels = profile.desiredTraits.map((id) => TRAITS.find((t) => t.id === id));
  const withPath = traitLabels.filter((t) => t && t.tracks.length > 0).map((t) => t!.label);
  const withoutPath = traitLabels.filter((t) => t && t.tracks.length === 0).map((t) => t!.label);
  const productive = PRODUCTIVE_TIMES.find((p) => p.value === profile.productiveTime)?.label;

  if (profile.desiredTraits.length === 0 && !profile.selfDescription && !profile.futureDay) return null;

  return (
    <Section title="Seni nasıl tanıyoruz?">
      <Surface>
        {withPath.length > 0 && (
          <View style={styles.profileRow}>
            <Label>Olmak istediğin</Label>
            <Body>{withPath.join(', ')}</Body>
            <Muted>Yollarını ve her kartın “Bunu neden görüyorum?” açıklamasını belirliyor.</Muted>
          </View>
        )}
        {withoutPath.length > 0 && (
          <View style={styles.profileRow}>
            <Label>Henüz yolu olmayan hedeflerin</Label>
            <Body>{withoutPath.join(', ')}</Body>
            <Muted>Hangi yolların hazırlanacağına karar verirken kullanılacak.</Muted>
          </View>
        )}
        {profile.selfDescription ? (
          <View style={styles.profileRow}>
            <Label>Şu anki sen</Label>
            <Body style={styles.why}>“{profile.selfDescription}”</Body>
          </View>
        ) : null}
        {profile.futureDay ? (
          <View style={styles.profileRow}>
            <Label>5 yıl sonraki bir günün</Label>
            <Body style={styles.why}>“{profile.futureDay}”</Body>
          </View>
        ) : null}
        {(profile.selfDescription || profile.futureDay) && (
          <Muted>
            Yazdıkların şu an yol önerisi için kullanılıyor. Kişiselleştirme servisi bağlandığında kart metinleri de
            bunlara göre uyarlanacak.
          </Muted>
        )}
        <View style={styles.profileRow}>
          <Label>Alışkanlıkların</Label>
          <Muted>
            {[
              profile.timeSinks.length ? `Boş zamanın: ${toTurkishLower(profile.timeSinks.join(', '))}` : '',
              productive ? `Kendine vakit: ${toTurkishLower(productive)}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Muted>
        </View>
      </Surface>
    </Section>
  );
}

const styles = StyleSheet.create({
  profileRow: { gap: 2 },
  spread: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 18, minHeight: 80 },
  why: { fontStyle: 'italic' },
  weeks: { gap: Spacing.sm },
  week: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 2 },
  small: { fontSize: 12 },
});
