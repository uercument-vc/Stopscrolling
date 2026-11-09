import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Chip, Heading, Label, Muted, ProgressBar, Row, Screen, Segmented, Surface, Title } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { TRACK_LIST, TRACKS } from '@/content/library';
import { composeIdentity, slotsForBudget, TONE_LABELS, weightPercents, equalWeights } from '@/domain/recipe';
import type { DailyBudget, Level, Tone } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { notifications } from '@/services/notifications';
import { useAppStore } from '@/store/app-store';

const MAX_PILLARS = 3;
const STEPS = 6;

const LEVELS: { value: Level; label: string }[] = [
  { value: 'baslangic', label: 'Başlangıç' },
  { value: 'orta', label: 'Orta' },
  { value: 'ileri', label: 'İleri' },
];
const BUDGET_OPTIONS: { value: DailyBudget; label: string }[] = [
  { value: 5, label: '5 dk' },
  { value: 10, label: '10 dk' },
  { value: 15, label: '15 dk' },
];
const DOSE_TIMES = ['07:00', '07:30', '08:00', '09:00', '12:30', '20:00'];
const SOCIAL_HOURS = ['1 saatten az', '1–2 saat', '2–3 saat', '3–4 saat', '4 saatten fazla'];

export default function OnboardingScreen() {
  const theme = useTheme();
  const today = useToday();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [identity, setIdentity] = useState('');
  const [identityEdited, setIdentityEdited] = useState(false);
  const [whys, setWhys] = useState<Record<string, string>>({});
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [budget, setBudget] = useState<DailyBudget>(10);
  const [doseTime, setDoseTime] = useState('07:30');
  const [baseline, setBaseline] = useState('');
  const [tone, setTone] = useState<Tone>('nazik');

  const suggestedIdentity = useMemo(
    () => composeIdentity(selected.map((id) => TRACKS[id].identityPhrase)),
    [selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_PILLARS ? [...prev, id] : prev,
    );

  const next = () => {
    if (step === 1 && !identityEdited) setIdentity(suggestedIdentity);
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    completeOnboarding(
      {
        identity: identity || suggestedIdentity,
        pillars: selected.map((trackId) => ({
          trackId,
          why: whys[trackId] ?? '',
          level: levels[trackId] ?? 'baslangic',
        })),
        budget,
        tone,
        doseTime,
        baselineSocialHours: baseline,
      },
      today,
    );
    void notifications.requestPermission();
  };

  const canContinue =
    step === 0 ||
    (step === 1 && selected.length > 0) ||
    (step === 2 && identity.trim().length > 0) ||
    step === 3 ||
    (step === 4 && baseline !== '') ||
    step === 5;

  const inputStyle = [styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }];

  return (
    <Screen withTabBar={false}>
      {step > 0 && (
        <View style={styles.header}>
          <ProgressBar value={step / (STEPS - 1)} />
          <Button label="Geri" variant="ghost" small onPress={back} style={styles.back} />
        </View>
      )}

      {step === 0 && (
        <View style={styles.hero}>
          <Label>Stopscrolling</Label>
          <Title style={styles.heroTitle}>Algoritma seni değil, sen algoritmayı yönet.</Title>
          <Body>
            Kim olmak istediğini sen söyle. Her gün sana 10 dakikada biten, uygulanabilir bir doz hazırlayalım. Sonra
            seni hayatına geri gönderelim.
          </Body>
          <Muted>Sonsuz akış yok. Beğeni yok. Kıyas sadece dünkü seninle.</Muted>
        </View>
      )}

      {step === 1 && (
        <View style={styles.step}>
          <Title>5 yıl sonraki sen nasıl biri?</Title>
          <Muted>En fazla {MAX_PILLARS} tane seç. Ne kadar az, o kadar iyi.</Muted>
          {TRACK_LIST.map((track) => {
            const isSelected = selected.includes(track.id);
            const disabled = !isSelected && selected.length >= MAX_PILLARS;
            return (
              <Surface
                key={track.id}
                style={[
                  isSelected && { borderColor: theme.accent, backgroundColor: theme.accentSoft },
                  disabled && { opacity: 0.5 },
                ]}>
                <Row style={styles.spread}>
                  <View style={styles.flex}>
                    <Heading>{track.templateTitle}</Heading>
                    <Muted>{track.description}</Muted>
                  </View>
                  <Button
                    small
                    label={isSelected ? 'Seçildi' : 'Seç'}
                    variant={isSelected ? 'primary' : 'secondary'}
                    disabled={disabled}
                    onPress={() => toggle(track.id)}
                  />
                </Row>
              </Surface>
            );
          })}
        </View>
      )}

      {step === 2 && (
        <View style={styles.step}>
          <Title>Kimlik cümlen</Title>
          <Muted>Bu cümle uygulamanın pusulası. Senin kelimelerinle olsun; istediğin gibi düzenle.</Muted>
          <TextInput
            value={identity}
            onChangeText={(text) => {
              setIdentity(text);
              setIdentityEdited(true);
            }}
            multiline
            style={[inputStyle, styles.identityInput]}
          />
        </View>
      )}

      {step === 3 && (
        <View style={styles.step}>
          <Title>Neden istiyorsun?</Title>
          <Muted>Zor günlerde sana kendi cümlenle hatırlatacağız.</Muted>
          {selected.map((id) => {
            const track = TRACKS[id];
            return (
              <Surface key={id}>
                <Heading>{track.pillarTitle}</Heading>
                <TextInput
                  value={whys[id] ?? ''}
                  onChangeText={(text) => setWhys((w) => ({ ...w, [id]: text }))}
                  placeholder={track.whyPlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={inputStyle}
                />
                <Label>Şu anki seviyen</Label>
                <Segmented
                  options={LEVELS}
                  value={levels[id] ?? 'baslangic'}
                  onChange={(level) => setLevels((l) => ({ ...l, [id]: level }))}
                />
                {(levels[id] ?? 'baslangic') !== 'baslangic' && (
                  <Muted>Bu seviyenin yolu hazırlanıyor. Şimdilik temel yoldan başlıyorsun.</Muted>
                )}
              </Surface>
            );
          })}
        </View>
      )}

      {step === 4 && (
        <View style={styles.step}>
          <Title>Zaman</Title>
          <Label>Günde bana kaç dakika ayırırsın?</Label>
          <Segmented options={BUDGET_OPTIONS} value={budget} onChange={setBudget} />
          <Label>Doz ne zaman hazır olsun?</Label>
          <Row>
            {DOSE_TIMES.map((t) => (
              <Chip key={t} label={t} selected={doseTime === t} onPress={() => setDoseTime(t)} />
            ))}
          </Row>
          <Label>Şu an günde ne kadar sosyal medyadasın?</Label>
          <Muted>Tahmin yeterli. Bir ay sonra karşılaştırmak için soruyoruz; bu bir yargı değil.</Muted>
          <Row>
            {SOCIAL_HOURS.map((h) => (
              <Chip key={h} label={h} selected={baseline === h} onPress={() => setBaseline(h)} />
            ))}
          </Row>
        </View>
      )}

      {step === 5 && (
        <View style={styles.step}>
          <Title>Algoritman bu</Title>
          <Muted>İstediğin an Tarif sekmesinden değiştirebilirsin. Hiçbir şey senin onayın olmadan değişmez.</Muted>
          <Surface>
            {Object.entries(weightPercents(equalWeights(selected))).map(([id, pct]) => (
              <Row key={id} style={styles.spread}>
                <Body>{TRACKS[id].pillarTitle}</Body>
                <Body>%{pct}</Body>
              </Row>
            ))}
            <Row style={styles.spread}>
              <Body>Günlük süre</Body>
              <Body>{budget} dk</Body>
            </Row>
            <Row style={styles.spread}>
              <Body>Doz saati</Body>
              <Body>{doseTime}</Body>
            </Row>
            <Muted>
              Günde {Math.min(slotsForBudget(budget), selected.length)} sütuna yer var. Her öğren kartı bir uygula kartına
              bağlı; günde en fazla 1 ilham ve 1 yansıt kartı.
            </Muted>
          </Surface>
          <Label>Sana nasıl seslenelim?</Label>
          <Segmented
            options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t] }))}
            value={tone}
            onChange={setTone}
          />
        </View>
      )}

      <Button
        label={step === 0 ? 'Başla' : step === STEPS - 1 ? 'İlk dozumu hazırla' : 'Devam'}
        onPress={step === STEPS - 1 ? finish : next}
        disabled={!canContinue}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.sm },
  back: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  hero: { gap: Spacing.lg, paddingTop: Spacing.xxl * 2 },
  heroTitle: { fontSize: 32, lineHeight: 40 },
  step: { gap: Spacing.md },
  spread: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  flex: { flex: 1, gap: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  identityInput: { minHeight: 96, fontSize: 18, lineHeight: 26 },
});
