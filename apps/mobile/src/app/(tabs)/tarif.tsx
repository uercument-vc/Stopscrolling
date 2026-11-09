import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Body, Button, Chip, Heading, Label, Muted, Row, Screen, Section, Segmented, Stepper, Surface, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatRelativeDay } from '@/domain/dates';
import { BUDGETS, describeRecipeChanges, slotsForBudget, TONE_LABELS, weightPercents } from '@/domain/recipe';
import type { Recipe, Tone } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { useAppStore } from '@/store/app-store';

const DOSE_TIMES = ['07:00', '07:30', '08:00', '09:00', '12:30', '20:00'];
const WEIGHT_STEP = 10;

/**
 * Tarif = algoritmanın kendisi. Burada görünmeyen hiçbir sıralama kuralı yok.
 */
export default function RecipeScreen() {
  const theme = useTheme();
  const today = useToday();
  const recipe = useAppStore((s) => s.recipe);
  const pillars = useAppStore((s) => s.pillars);
  const history = useAppStore((s) => s.recipeHistory);
  const updateRecipe = useAppStore((s) => s.updateRecipe);
  const rollbackRecipe = useAppStore((s) => s.rollbackRecipe);
  const resetAll = useAppStore((s) => s.resetAll);

  const [draft, setDraft] = useState<Recipe>(recipe);
  const [confirmReset, setConfirmReset] = useState(false);
  // Tarif kaydedilince (ya da bir öneri onaylanınca) taslağı yeni sürüme eşitle.
  const [seenVersion, setSeenVersion] = useState(recipe.version);
  if (recipe.version !== seenVersion) {
    setSeenVersion(recipe.version);
    setDraft(recipe);
  }

  const percents = weightPercents(draft.weights);
  const activeCount = pillars.filter((p) => (draft.weights[p.id] ?? 0) > 0).length;
  const changes = describeRecipeChanges(recipe, draft, pillars);

  const setWeight = (id: string, delta: number) =>
    setDraft((d) => ({ ...d, weights: { ...d.weights, [id]: Math.min(100, Math.max(0, d.weights[id] + delta)) } }));

  return (
    <Screen>
      <Title>Tarif</Title>
      <Surface style={{ backgroundColor: theme.accentSoft, borderColor: theme.accent }}>
        <Body>
          Bu senin algoritman. Dozun sadece burada seçtiklerine, kartlara verdiğin geri bildirime ve yaptığın eylemlere
          göre hazırlanır. Ekranda kaç saniye kaldığın ölçülmez.
        </Body>
      </Surface>

      <Section title="Sütun ağırlıkları">
        {pillars.map((p) => {
          const weight = draft.weights[p.id] ?? 0;
          return (
            <Row key={p.id} style={styles.spread}>
              <View style={styles.flex}>
                <Body>{p.title}</Body>
                <Muted>{weight === 0 ? 'Duraklatıldı' : `%${percents[p.id]}`}</Muted>
              </View>
              <Stepper
                value={String(weight)}
                onDecrement={() => setWeight(p.id, -WEIGHT_STEP)}
                onIncrement={() => setWeight(p.id, WEIGHT_STEP)}
                canDecrement={weight > 0 && !(activeCount === 1 && weight - WEIGHT_STEP <= 0)}
                canIncrement={weight < 100}
              />
            </Row>
          );
        })}
        <Muted>Ağırlıklar görelidir. 0, sütunu duraklatır; en az bir sütun açık kalır.</Muted>
      </Section>

      <Section title="Günlük süre">
        <Segmented
          options={BUDGETS.map((b) => ({ value: b, label: `${b} dk` }))}
          value={draft.budget}
          onChange={(budget) => setDraft((d) => ({ ...d, budget }))}
        />
        <Muted>
          Bu süreyle günde {Math.min(slotsForBudget(draft.budget), activeCount)} sütuna yer var
          {activeCount > slotsForBudget(draft.budget) ? '; sütunlar ağırlıklarına göre sırayla gelir.' : '.'}
        </Muted>
      </Section>

      <Section title="Ton">
        <Segmented
          options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t] }))}
          value={draft.tone}
          onChange={(tone) => setDraft((d) => ({ ...d, tone }))}
        />
      </Section>

      <Section title="Kart karışımı">
        <Muted>Her öğren kartı bir uygula kartıyla gelir; bu ikisi kapatılamaz.</Muted>
        <Row style={styles.spread}>
          <Body>İlham kartı (günde en fazla 1)</Body>
          <Switch
            value={draft.includeInspire}
            onValueChange={(v) => setDraft((d) => ({ ...d, includeInspire: v }))}
            trackColor={{ true: theme.accent, false: theme.border }}
          />
        </Row>
        <Row style={styles.spread}>
          <Body>Yansıt kartı (günde en fazla 1)</Body>
          <Switch
            value={draft.includeReflect}
            onValueChange={(v) => setDraft((d) => ({ ...d, includeReflect: v }))}
            trackColor={{ true: theme.accent, false: theme.border }}
          />
        </Row>
      </Section>

      <Section title="Doz saati">
        <Row>
          {DOSE_TIMES.map((t) => (
            <Chip key={t} label={t} selected={draft.doseTime === t} onPress={() => setDraft((d) => ({ ...d, doseTime: t }))} />
          ))}
        </Row>
      </Section>

      {changes.length > 0 && (
        <Surface style={{ borderColor: theme.accent }}>
          <Label>Kaydedilmemiş değişiklikler</Label>
          {changes.map((c) => (
            <Body key={c}>• {c}</Body>
          ))}
          <Muted>Başlamadığın bugünkü doz yeni tarife göre yeniden hazırlanır.</Muted>
          <Row>
            <Button
              label="Kaydet"
              onPress={() => {
                const { version: _ignored, ...next } = draft;
                updateRecipe(next, 'kullanici', today);
              }}
            />
            <Button variant="ghost" label="Vazgeç" onPress={() => setDraft(recipe)} />
          </Row>
        </Surface>
      )}

      <Section title="Değişiklik geçmişi">
        {[...history].reverse().map((h) => (
          <Surface key={h.version}>
            <Row style={styles.spread}>
              <Heading>v{h.version}</Heading>
              <Muted>
                {formatRelativeDay(h.date, today)} · {h.by === 'oneri' ? 'Öneri (senin onayınla)' : 'Sen'}
              </Muted>
            </Row>
            {h.changes.map((c) => (
              <Muted key={c}>• {c}</Muted>
            ))}
            {h.version !== recipe.version && (
              <Button small variant="ghost" label="Bu sürüme dön" style={styles.left} onPress={() => rollbackRecipe(h.version, today)} />
            )}
          </Surface>
        ))}
      </Section>

      <Section title="Verilerin">
        <Muted>Tüm veriler şu an sadece bu cihazda. Silersen kimliğin, tarifin, dozların ve eylemlerin kalıcı olarak silinir.</Muted>
        {confirmReset ? (
          <Row>
            <Button variant="danger" label="Evet, hepsini sil" onPress={resetAll} />
            <Button variant="ghost" label="Vazgeç" onPress={() => setConfirmReset(false)} />
          </Row>
        ) : (
          <Button variant="danger" label="Tüm verilerimi sil" onPress={() => setConfirmReset(true)} />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spread: { justifyContent: 'space-between', flexWrap: 'nowrap', gap: Spacing.md },
  flex: { flex: 1 },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
