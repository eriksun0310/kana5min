import { Redirect } from 'expo-router';
import React from 'react';

// 開發用深連結 kana5min://debug?preset=hiragana-done|all-done|reset。
// 實作只在 __DEV__ 引用（Metro 會把正式包裡的 require 常數折疊掉）；正式版開這個連結直接回首頁。
let Impl: React.ComponentType | null = null;
if (__DEV__) {
  Impl = require('../src/dev/DebugPreset').default;
}

export default function DebugRoute() {
  return Impl ? <Impl /> : <Redirect href="/" />;
}
