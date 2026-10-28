import { Redirect } from 'expo-router';
import React from 'react';

// 開發用：分享卡預覽（kana5min://share-preview?id=h-ku），正式版回首頁。
let Impl: React.ComponentType | null = null;
if (__DEV__) {
  Impl = require('../src/dev/SharePreview').default;
}

export default function SharePreviewRoute() {
  return Impl ? <Impl /> : <Redirect href="/" />;
}
