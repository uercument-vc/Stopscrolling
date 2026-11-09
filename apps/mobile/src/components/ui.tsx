import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { toTurkishUpper } from '@/domain/turkce';
import type { CardType } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Yerleşim
// ---------------------------------------------------------------------------

/** Web'deki sabit alt çubuk ~64 px; native'de sistem sekme çubuğu. */
const TAB_BAR_SPACE = Platform.OS === 'web' ? 72 : BottomTabInset;

export function Screen({
  children,
  withTabBar = true,
  scroll = true,
}: {
  children: ReactNode;
  withTabBar?: boolean;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: (withTabBar ? TAB_BAR_SPACE : 0) + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Label>{title}</Label>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Metin
// ---------------------------------------------------------------------------

type TP = TextProps & { color?: string };

function makeText(base: object, colorKey: 'text' | 'textSecondary') {
  return function T({ style, color, ...rest }: TP) {
    const theme = useTheme();
    return <Text style={[base, { color: color ?? theme[colorKey] }, style]} {...rest} />;
  };
}

export const Title = makeText({ fontSize: 26, lineHeight: 32, fontWeight: '700' }, 'text');
export const Heading = makeText({ fontSize: 19, lineHeight: 26, fontWeight: '600' }, 'text');
export const Body = makeText({ fontSize: 16, lineHeight: 24, fontWeight: '400' }, 'text');
export const Muted = makeText({ fontSize: 14, lineHeight: 20, fontWeight: '400' }, 'textSecondary');
/** Etiketler Türkçe kurala göre büyütülür (CSS uppercase "PAZARTESI" yazabiliyor). */
const LabelText = makeText({ fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.8 }, 'textSecondary');

export function Label({ children, ...rest }: TP) {
  const upper = (node: ReactNode): ReactNode =>
    typeof node === 'string' ? toTurkishUpper(node) : Array.isArray(node) ? node.map(upper) : node;
  return <LabelText {...rest}>{upper(children)}</LabelText>;
}

// ---------------------------------------------------------------------------
// Kontroller
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.accent, fg: theme.accentText, border: theme.accent },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.accent, border: 'transparent' },
    danger: { bg: 'transparent', fg: theme.danger, border: theme.danger },
  };
  const c = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: c.bg, borderColor: c.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: c.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accentSoft : theme.surface,
          borderColor: selected ? theme.accent : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? theme.accent : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceMuted }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text
              style={[styles.segmentText, { color: selected ? theme.text : theme.textSecondary }]}
              numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
}: {
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <Button label="−" small variant="secondary" onPress={onDecrement} disabled={!canDecrement} />
      <Text style={[styles.stepperValue, { color: theme.text }]}>{value}</Text>
      <Button label="+" small variant="secondary" onPress={onIncrement} disabled={!canIncrement} />
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
      <View
        style={[
          styles.progressFill,
          { backgroundColor: theme.accent, width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` },
        ]}
      />
    </View>
  );
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  ogren: 'Öğren',
  uygula: 'Uygula',
  ilham: 'İlham',
  yansit: 'Yansıt',
  tekrar: 'Tekrar',
};

export function TypeBadge({ type }: { type: CardType }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { borderColor: theme[type] }]}>
      <Text style={[styles.badgeText, { color: theme[type] }]}>{CARD_TYPE_LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.xl },
  surface: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: Spacing.md },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  buttonTextSmall: { fontSize: 14 },
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperValue: { minWidth: 48, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
