import { KleeOne_600SemiBold } from '@expo-google-fonts/klee-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { LogBox, View } from 'react-native';
import { openSqliteRepository } from '../src/db';
import { initPurchases } from '../src/monetization/purchases';
import { useProgressStore, waitForSettingsHydration } from '../src/store';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme, useThemeName } from '../src/theme/useTheme';

// 開發版偶爾（JS 重新載入後第一次啟動）會出現 RN 內建的原生動畫警告：
// 「Sending `onAnimatedValueUpdate` with no listeners registered.」
// 來源是 expo-router 分頁導覽內部的 Animated（原生驅動），App 自己的程式碼沒有用到 Animated，
// 無法從 App 端修掉；警告只在 __DEV__ 出現，會用 LogBox 工具列擋住底部按鈕，所以只忽略這一條。
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered']);

// 字型、資料庫、設定都準備好之前保持啟動畫面
SplashScreen.preventAutoHideAsync().catch(() => {});

/** 開啟 sqlite 並把進度載入 progressStore；同時等設定從 AsyncStorage 讀回。 */
async function bootstrap() {
  const [repo] = await Promise.all([openSqliteRepository(), waitForSettingsHydration()]);
  await useProgressStore.getState().load(repo);
  await useSessionStore.getState().loadSaved(Date.now());
  // 設定讀回之後才同步購買狀態（沒有 key 時什麼都不做；不等待結果，不擋啟動）
  initPurchases().catch(() => {});
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ KleeOne_600SemiBold });
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<unknown>(null);
  const t = useTheme();
  const themeName = useThemeName();

  useEffect(() => {
    bootstrap()
      .then(() => setDataReady(true))
      .catch((e) => setDataError(e));
  }, []);

  // 字型載入失敗時仍然進 App（退回系統字型），不要卡在啟動畫面
  const ready = (fontsLoaded || !!fontError) && (dataReady || !!dataError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (dataError) {
    // 資料庫打不開時直接丟出去，讓開發時看得到原因
    throw dataError;
  }
  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        {/* 歡迎頁是從 (tabs) 的 Redirect 導過來的，不要有推入動畫，否則啟動時會看到畫面從右邊滑進來 */}
        <Stack.Screen name="welcome" options={{ animation: 'none', gestureEnabled: false }} />
      </Stack>
    </View>
  );
}
