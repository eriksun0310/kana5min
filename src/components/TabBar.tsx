import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  testID?: string;
}

export interface TabBarProps {
  items: TabItem[];
  activeKey: string;
  onPress: (key: string) => void;
}

/** 底部導覽列：上邊線、四欄、圖示 22、字 11、選中 accentText 粗體（設計檔 C2-02 nav）。 */
export function TabBar({ items, activeKey, onPress }: TabBarProps) {
  const t = useTheme();
  const bottom = useBottomPad(28);
  return (
    <View style={[styles.nav, { borderTopColor: t.line, backgroundColor: t.bg, paddingBottom: bottom }]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        const color = active ? t.accentText : t.muted;
        return (
          <Pressable
            key={item.key}
            testID={item.testID ?? `tab-${item.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onPress(item.key)}
            style={styles.item}
          >
            <Icon name={item.icon} size={22} color={color} />
            <Text style={{ fontSize: 11, color, fontWeight: active ? '700' : '400' }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 4,
  },
  item: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    gap: 3,
  },
});
