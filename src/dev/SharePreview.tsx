import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Screen, ShareCard } from '../components';
import { buildShareCard } from '../logic/shareCard';
import { useThemeName } from '../theme/useTheme';

/** kana5min://share-preview?id=h-ku：把分享卡直接顯示在螢幕上（截圖用）。只由 app/share-preview.tsx 在 __DEV__ 載入。 */
export default function SharePreview() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const themeName = useThemeName();
  const { width } = useWindowDimensions();
  const data = buildShareCard(id ?? 'h-ku', themeName);
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {data ? <ShareCard data={data} size={width} /> : null}
      </View>
    </Screen>
  );
}
