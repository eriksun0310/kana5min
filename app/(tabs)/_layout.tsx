import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { TabBar, type TabItem } from '../../src/components';
import { entryRoute } from '../../src/logic/tour';
import { useSettingsStore } from '../../src/store';

const ITEMS: TabItem[] = [
  { key: 'index', label: '今天', icon: 'home', testID: 'tab-home' },
  { key: 'chart', label: '五十音表', icon: 'grid', testID: 'tab-chart' },
  { key: 'practice', label: '練習', icon: 'practice', testID: 'tab-practice' },
  { key: 'settings', label: '設定', icon: 'settings', testID: 'tab-settings' },
];

export default function TabsLayout() {
  const onboarded = useSettingsStore((s) => s.onboarded);
  const tourSeen = useSettingsStore((s) => s.tourSeen);
  // 首次開啟先導去 /tour（3 頁導覽），再 /welcome（選每日目標）；設定已在根 layout 讀回，不會閃一下
  const entry = entryRoute({ onboarded, tourSeen });
  if (entry === 'tour') return <Redirect href="/tour" />;
  if (entry === 'welcome') return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          items={ITEMS}
          activeKey={state.routes[state.index]?.name ?? 'index'}
          onPress={(name) => {
            const route = state.routes.find((r) => r.name === name);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chart" />
      <Tabs.Screen name="practice" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
