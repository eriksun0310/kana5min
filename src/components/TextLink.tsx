import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface TextLinkProps {
  label: string;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** 純文字連結：主色加底線，全 App 統一（取代以前的灰色小字，看得出能按）。 */
export function TextLink({ label, onPress, testID, style }: TextLinkProps) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 10, right: 10 }}
      style={[styles.link, style]}
    >
      <Text style={{ fontSize: 14, color: t.accentText, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
});
