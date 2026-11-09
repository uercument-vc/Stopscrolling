import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BAR_HEIGHT = 60;

/**
 * Web'de altta sabit, mobil benzeri bir sekme çubuğu.
 *
 * Not: expo-router, TabTrigger'ları TabList'in (asChild ile) en fazla bir katman
 * altında arar. Bu yüzden tetikleyiciler doğrudan satırın çocukları; tam genişlikteki
 * arka plan ayrı bir katman. asChild altında stil dizisi de kabul edilmiyor.
 */
export default function AppTabs() {
  const theme = useTheme();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <View
        pointerEvents="none"
        style={[styles.background, { backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      <TabList asChild>
        <View style={styles.row}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Bugün</TabButton>
          </TabTrigger>
          <TabTrigger name="eylemler" href="/eylemler" asChild>
            <TabButton>Eylemler</TabButton>
          </TabTrigger>
          <TabTrigger name="yolum" href="/yolum" asChild>
            <TabButton>Yolum</TabButton>
          </TabTrigger>
          <TabTrigger name="tarif" href="/tarif" asChild>
            <TabButton>Tarif</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  return (
    <Pressable {...props} accessibilityRole="tab" aria-selected={isFocused} style={styles.button}>
      <View style={[styles.pill, isFocused && { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.label, { color: isFocused ? theme.accent : theme.textSecondary }]}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    marginHorizontal: 'auto',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  button: { flex: 1 },
  pill: { alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md },
  label: { fontSize: 14, fontWeight: '600' },
});
