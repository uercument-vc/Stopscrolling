import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Tutorial } from '@/components/tutorial';
import { Body, Button, Chip, Heading, Label, Muted, ProgressBar, Row, Screen, Segmented, Surface, Title } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { TRACK_LIST, TRACKS, TRAITS } from '@/content/library';
import {
  defaultSelection,
  describeSuggestion,
  identityFromTraits,
  levelFromAnswer,
  MAX_TRAITS,
  motivationPhrase,
  PRODUCTIVE_TIMES,
  suggestTracks,
  TIME_SINKS,
} from '@/domain/profile';
import { equalWeights, slotsForBudget, TONE_LABELS, weightPercents } from '@/domain/recipe';
import type { DailyBudget, ProductiveTime, Tone } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { notifications } from '@/services/notifications';
import { useAppStore } from '@/store/app-store';

const MAX_PILLARS = 3;

/** 0: tanıtım · 1: şu anki sen · 2: olmak istediğin sen · 3: önerilen yollar · 4: kimlik · 5: neden ve seviye · 6: zaman · 7: tarif */
const STEPS = 8;

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
  const [tutorialPage, setTutorialPage] = useState(0);

  // 1. Şu anki sen
  const [timeSinks, setTimeSinks] = useState<string[]>([]);
  const [baseline, setBaseline] = useState('');
  const [productiveTime, setProductiveTime] = useState<ProductiveTime>('sabah');
  const [selfDescription, setSelfDescription] = useState('');

  // 2. Olmak istediğin sen
  const [desiredTraits, setDesiredTraits] = useState<string[]>([]);
  const [futureDay, setFutureDay] = useState('');

  // 3–5. Yollar, kimlik, nedenler
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestionKey, setSuggestionKey] = useState('');
  const [identity, setIdentity] = useState('');
  const [identityEdited, setIdentityEdited] = useState(false);
  const [whys, setWhys] = useState<Record<string, string>>({});
  const [levelAnswers, setLevelAnswers] = useState<Record<string, number>>({});

  // 6–7. Zaman ve ton
  const [budget, setBudget] = useState<DailyBudget>(10);
  const [doseTime, setDoseTime] = useState('07:30');
  const [doseTimeTouched, setDoseTimeTouched] = useState(false);
  const [tone, setTone] = useState<Tone>('nazik');

  const { suggestions, unmetTraits } = useMemo(
    () =>
      suggestTracks({ desiredTraits, texts: [selfDescription, futureDay], traits: TRAITS, tracks: TRACK_LIST }),
    [desiredTraits, selfDescription, futureDay],
  );
  const traitLabels = desiredTraits.map((id) => TRAITS.find((t) => t.id === id)?.label ?? id);
  const motivatedBy = (trackId: string) => suggestions.find((s) => s.trackId === trackId)?.traits ?? [];

  const toggleIn = (list: string[], id: string, max: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : list.length < max ? [...list, id] : list;

  const next = () => {
    if (step === 2) {
      // Girdiler değiştiyse öneriyi yenile; değişmediyse kullanıcının seçimini koru.
      const key = JSON.stringify([desiredTraits, selfDescription, futureDay]);
      if (key !== suggestionKey) {
        setSuggestionKey(key);
        setSelected(defaultSelection(suggestions));
      }
    }
    if (step === 3 && !identityEdited) {
      setIdentity(identityFromTraits(traitLabels, selected.map((id) => TRACKS[id].identityPhrase)));
    }
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    completeOnboarding(
      {
        identity,
        profile: { timeSinks, productiveTime, baselineSocialHours: baseline, selfDescription, desiredTraits, futureDay },
        pillars: selected.map((trackId) => ({
          trackId,
          why: whys[trackId] ?? '',
          level: levelFromAnswer(levelAnswers[trackId] ?? 0),
          motivatedBy: motivatedBy(trackId),
        })),
        budget,
        tone,
        doseTime,
      },
      today,
    );
    void notifications.requestPermission();
  };

  const canContinue =
    (step === 1 && baseline !== '') ||
    (step === 2 && desiredTraits.length > 0) ||
    (step === 3 && selected.length > 0) ||
    (step === 4 && identity.trim().length > 0) ||
    step >= 5;

  const inputStyle = [styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }];
  const otherTracks = TRACK_LIST.filter((t) => !suggestions.some((s) => s.trackId === t.id));

  const trackCard = (trackId: string, reason?: string) => {
    const track = TRACKS[trackId];
    const isSelected = selected.includes(trackId);
    const disabled = !isSelected && selected.length >= MAX_PILLARS;
    return (
      <Surface
        key={trackId}
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
            onPress={() => setSelected((prev) => toggleIn(prev, trackId, MAX_PILLARS))}
          />
        </Row>
        {reason ? <Muted style={{ color: theme.accent }}>{reason}</Muted> : null}
      </Surface>
    );
  };

  return (
    <Screen withTabBar={false}>
      {step > 0 && (
        <View style={styles.header}>
          <ProgressBar value={step / (STEPS - 1)} />
          <Button label="Geri" variant="ghost" small onPress={back} style={styles.back} />
        </View>
      )}

      {step === 0 && <Tutorial page={tutorialPage} onPageChange={setTutorialPage} onDone={next} />}

      {step === 1 && (
        <View style={styles.step}>
          <Title>Şu anki sen</Title>
          <Muted>Seni tanımadan sana uygun bir yol öneremeyiz. Burada yargı yok; sadece bir başlangıç noktası.</Muted>

          <Label>Boş zamanın en çok nereye gidiyor?</Label>
          <Row>
            {TIME_SINKS.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={timeSinks.includes(t)}
                onPress={() => setTimeSinks((prev) => toggleIn(prev, t, TIME_SINKS.length))}
              />
            ))}
          </Row>

          <Label>Günde ne kadar sosyal medyadasın?</Label>
          <Muted>Tahmin yeterli. Bir ay sonra karşılaştırmak için soruyoruz.</Muted>
          <Row>
            {SOCIAL_HOURS.map((h) => (
              <Chip key={h} label={h} selected={baseline === h} onPress={() => setBaseline(h)} />
            ))}
          </Row>

          <Label>Günün hangi saatinde kendine vakit ayırabiliyorsun?</Label>
          <Segmented
            options={PRODUCTIVE_TIMES.map((p) => ({ value: p.value, label: p.label }))}
            value={productiveTime}
            onChange={(value) => {
              setProductiveTime(value);
              if (!doseTimeTouched) setDoseTime(PRODUCTIVE_TIMES.find((p) => p.value === value)!.doseTime);
            }}
          />

          <Label>Kendini bir iki cümleyle anlat (isteğe bağlı)</Label>
          <TextInput
            value={selfDescription}
            onChangeText={setSelfDescription}
            placeholder="Ör. 27 yaşındayım, yazılımcıyım. Akşamları yorgun oluyorum ve telefonda kayboluyorum."
            placeholderTextColor={theme.textSecondary}
            maxLength={300}
            multiline
            style={[inputStyle, styles.tall]}
          />
        </View>
      )}

      {step === 2 && (
        <View style={styles.step}>
          <Title>Olmak istediğin sen</Title>
          <Muted>
            Olmak istediğin kişiyi en iyi anlatan en fazla {MAX_TRAITS} özelliği seç. Algoritman bunlara göre yön alacak.
          </Muted>
          <Row>
            {TRAITS.map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                selected={desiredTraits.includes(t.id)}
                onPress={() => setDesiredTraits((prev) => toggleIn(prev, t.id, MAX_TRAITS))}
              />
            ))}
          </Row>
          <Muted>
            {desiredTraits.length}/{MAX_TRAITS} seçildi
          </Muted>

          <Label>5 yıl sonra sıradan bir gününü anlat (isteğe bağlı)</Label>
          <TextInput
            value={futureDay}
            onChangeText={setFutureDay}
            placeholder="Ör. Sabah kitap okuyorum, işe yürüyerek gidiyorum, akşamları kendi projeme kod yazıyorum."
            placeholderTextColor={theme.textSecondary}
            maxLength={400}
            multiline
            style={[inputStyle, styles.tall]}
          />
        </View>
      )}

      {step === 3 && (
        <View style={styles.step}>
          <Title>Sana önerilen yollar</Title>
          <Muted>
            Seçtiğin özelliklere ve yazdıklarına göre. Ne kadar az, o kadar iyi: en fazla {MAX_PILLARS} yol.
          </Muted>

          {suggestions.length === 0 ? (
            <Surface>
              <Body>Seçtiklerin henüz hazır bir yolla eşleşmedi. Sana en yakın olanı aşağıdan seçebilirsin.</Body>
            </Surface>
          ) : (
            suggestions.map((s) => trackCard(s.trackId, describeSuggestion(s)))
          )}

          {unmetTraits.length > 0 && (
            <Surface style={{ backgroundColor: theme.surfaceMuted }}>
              <Label>Henüz yolu olmayan hedeflerin</Label>
              <Body>{unmetTraits.map((t) => t.label).join(', ')}</Body>
              <Muted>
                Bunlar için şu an hazır bir yolumuz yok; sana bunu dürüstçe söylemek istiyoruz. Kimlik cümlende yer
                alacaklar ve hangi yolların hazırlanacağına karar verirken kullanılacaklar.
              </Muted>
            </Surface>
          )}

          {otherTracks.length > 0 && (
            <>
              <Label>Diğer yollar</Label>
              {otherTracks.map((t) => trackCard(t.id))}
            </>
          )}
        </View>
      )}

      {step === 4 && (
        <View style={styles.step}>
          <Title>Kimlik cümlen</Title>
          <Muted>Seçtiğin özelliklerden kurduk. Bu cümle uygulamanın pusulası; senin kelimelerinle olsun.</Muted>
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

      {step === 5 && (
        <View style={styles.step}>
          <Title>Neden ve nereden başlıyorsun?</Title>
          <Muted>Nedenini zor günlerde sana kendi cümlenle hatırlatacağız. Seviye sorusu, nereden başlayacağını belirler.</Muted>
          {selected.map((id) => {
            const track = TRACKS[id];
            const motivation = motivationPhrase(motivatedBy(id));
            return (
              <Surface key={id}>
                <Heading>{track.pillarTitle}</Heading>
                {motivation ? <Muted style={{ color: theme.accent }}>{motivation}</Muted> : null}
                <TextInput
                  value={whys[id] ?? ''}
                  onChangeText={(text) => setWhys((w) => ({ ...w, [id]: text }))}
                  placeholder={track.whyPlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={inputStyle}
                />
                <Label>{track.levelQuestion.question}</Label>
                <Row>
                  {track.levelQuestion.options.map((option, index) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={levelAnswers[id] === index}
                      onPress={() => setLevelAnswers((a) => ({ ...a, [id]: index }))}
                    />
                  ))}
                </Row>
                {(levelAnswers[id] ?? 0) > 0 && (
                  <Muted>Bu seviyenin yolu hazırlanıyor. Şimdilik temel yoldan başlıyorsun.</Muted>
                )}
              </Surface>
            );
          })}
        </View>
      )}

      {step === 6 && (
        <View style={styles.step}>
          <Title>Zaman</Title>
          <Label>Günde bana kaç dakika ayırırsın?</Label>
          <Segmented options={BUDGET_OPTIONS} value={budget} onChange={setBudget} />
          <Label>Doz ne zaman hazır olsun?</Label>
          <Muted>Kendine vakit ayırabildiğin saate göre önerdik.</Muted>
          <Row>
            {DOSE_TIMES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={doseTime === t}
                onPress={() => {
                  setDoseTime(t);
                  setDoseTimeTouched(true);
                }}
              />
            ))}
          </Row>
        </View>
      )}

      {step === 7 && (
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

      {step > 0 && (
        <Button
          label={step === STEPS - 1 ? 'İlk dozumu hazırla' : 'Devam'}
          onPress={step === STEPS - 1 ? finish : next}
          disabled={!canContinue}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.sm },
  back: { alignSelf: 'flex-start', paddingHorizontal: 0 },
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
  tall: { minHeight: 88 },
  identityInput: { minHeight: 96, fontSize: 18, lineHeight: 26 },
});
