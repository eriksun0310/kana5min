import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** 主要按鈕：accent 底、onAccent 字，minHeight 58、radius 18。 */
export function PrimaryButton({ label, onPress, disabled, testID, style }: ButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: disabled ? t.track : t.accent, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.primaryLabel, { color: disabled ? t.muted : t.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

/** 次要按鈕：surface 底、line 邊框，minHeight 56、radius 18。 */
export function SecondaryButton({ label, onPress, disabled, testID, style }: ButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        {
          backgroundColor: t.surface,
          borderColor: t.line,
          opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.secondaryLabel, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryLabel: { fontSize: 16, fontWeight: '700' },
  secondary: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryLabel: { fontSize: 15, fontWeight: '700' },
});
