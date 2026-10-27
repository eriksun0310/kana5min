import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
  testID?: string;
}

/** 開關（設計檔 C2-12）：52×32、圓鈕 26，開啟時 accent 底。觸控範圍以 hitSlop 補到 44。 */
export function Toggle({ value, onValueChange, label, testID }: ToggleProps) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 52,
        height: 32,
        borderRadius: 999,
        padding: 3,
        backgroundColor: value ? t.accent : t.track,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: t.knob }} />
    </Pressable>
  );
}
