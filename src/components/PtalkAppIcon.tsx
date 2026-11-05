import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

// 有圖示檔的 App 用圖示，其餘用統一線條圖示。
const ICONS: Record<string, number> = {
  sushijp: require('../../assets/images/ptalk-apps/sushijp.png'),
  hitofude: require('../../assets/images/ptalk-apps/hitofude.png'),
  pizzatoeic: require('../../assets/images/ptalk-apps/pizzatoeic.png'),
};

export function PtalkAppIcon({ id, size = 48 }: { id: string; size?: number }) {
  const t = useTheme();
  const radius = Math.round(size * 0.25);
  const src = ICONS[id];
  if (src) {
    return (
      <Image
        source={src}
        style={{ width: size, height: size, borderRadius: radius, borderWidth: 1, borderColor: t.line }}
      />
    );
  }
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: t.flat }]}>
      <Icon name="grid" size={Math.round(size * 0.5)} color={t.muted} />
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' } });
