import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Icon, Screen } from '../../src/components';
import { OptionSheet, type SheetOption } from '../../src/components/OptionSheet';
import { Toggle } from '../../src/components/Toggle';
import type { Settings, ThemeSetting } from '../../src/data/types';
import {
  cancelReminder,
  enableReminder,
  REMINDER_TIME_OPTIONS,
  scheduleReminder,
} from '../../src/notifications/reminder';
import { isGraduated } from '../../src/logic/graduate';
import { useProgressStore, useSettingsStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const THEME_OPTIONS: { value: ThemeSetting; label: string; testID: string }[] = [
  { value: 'system', label: '跟隨系統', testID: 'theme-system' },
  { value: 'light', label: '亮色', testID: 'theme-light' },
  { value: 'dark', label: '暗色', testID: 'theme-dark' },
];

const GOAL_OPTIONS: SheetOption[] = [
  { value: '3', label: '3 分鐘', sub: '輕鬆' },
  { value: '5', label: '5 分鐘', sub: '推薦' },
  { value: '10', label: '10 分鐘', sub: '認真' },
];

const SPEED_OPTIONS: SheetOption[] = [
  { value: 'normal', label: '一般' },
  { value: 'slow', label: '慢速' },
];

const TIME_OPTIONS: SheetOption[] = REMINDER_TIME_OPTIONS.map((v) => ({ value: v, label: v }));

type SheetKind = 'goal' | 'speed' | 'time' | null;

// 開發者選單只在開發版本載入；正式包的 __DEV__ 為 false，Metro 會把這個 require 一併移除
const DebugMenu: React.ComponentType | null = __DEV__
  ? require('../../src/dev/DebugMenu').default
  : null;

/** C2-12 設定：外觀、學習、資料、關於。 */
export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(52);
  const progress = useProgressStore((s) => s.progress);
  const graduated = useMemo(() => isGraduated(Object.values(progress)), [progress]);
  const theme = useSettingsStore((s) => s.theme);
  const goal = useSettingsStore((s) => s.dailyGoalMinutes);
  const romajiAutoHide = useSettingsStore((s) => s.romajiAutoHide);
  const reminder = useSettingsStore((s) => s.reminder);
  const audioSpeed = useSettingsStore((s) => s.audioSpeed);
  const { setTheme, setDailyGoalMinutes, setRomajiAutoHide, setReminder, setAudioSpeed } =
    useSettingsStore.getState();
  const [sheet, setSheet] = useState<SheetKind>(null);

  const appName = Constants.expoConfig?.name ?? 'Kana 5min - 五十音入門';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const toggleReminder = async (next: boolean) => {
    if (!next) {
      setReminder({ enabled: false });
      await cancelReminder();
      return;
    }
    const ok = await enableReminder(reminder.time);
    if (ok) {
      setReminder({ enabled: true });
      return;
    }
    // 權限被拒：開關維持關閉並提示
    setReminder({ enabled: false });
    Alert.alert('需要通知權限', '請到系統設定開啟 Kana 5min 的通知，才能收到每日提醒。', [
      { text: '取消', style: 'cancel' },
      { text: '前往設定', onPress: () => Linking.openSettings().catch(() => {}) },
    ]);
  };

  const pickTime = async (time: string) => {
    setSheet(null);
    setReminder({ time });
    if (reminder.enabled) await scheduleReminder(time);
  };

  const rowStyle = [styles.row, { borderBottomColor: t.line }];

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top, height: top + 44 }]}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>設定</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="外觀">
          <Card>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 15, color: t.text }}>主題</Text>
              <View style={[styles.themeGroup, { backgroundColor: t.chip }]}>
                {THEME_OPTIONS.map((o) => {
                  const on = o.value === theme;
                  return (
                    <Pressable
                      key={o.value}
                      testID={o.testID}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      hitSlop={{ top: 3, bottom: 3 }}
                      onPress={() => setTheme(o.value)}
                      style={[styles.themeBtn, { backgroundColor: on ? t.surface : 'transparent' }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: on ? t.text : t.muted }}>
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>
        </Section>

        <Section title="學習">
          <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Pressable
              testID="row-daily-goal"
              accessibilityRole="button"
              onPress={() => setSheet('goal')}
              style={rowStyle}
            >
              <RowText label="每日目標" sub="每天的練習時間" />
              <Value text={`${goal} 分鐘`} />
            </Pressable>

            <View style={rowStyle}>
              <RowText label="顯示羅馬拼音" sub="熟練後會自動隱藏" />
              <Toggle
                testID="toggle-romaji"
                label="顯示羅馬拼音"
                value={romajiAutoHide}
                onValueChange={setRomajiAutoHide}
              />
            </View>

            <View style={rowStyle}>
              {/* 點文字區選時間；右側開關控制是否提醒 */}
              <Pressable
                testID="row-reminder-time"
                accessibilityRole="button"
                accessibilityLabel={`每日提醒時間，每天 ${reminder.time}`}
                onPress={() => setSheet('time')}
                style={styles.rowTextPress}
              >
                <RowText label="每日提醒" sub={`每天 ${reminder.time}`} />
              </Pressable>
              <Toggle
                testID="toggle-reminder"
                label="每日提醒"
                value={reminder.enabled}
                onValueChange={toggleReminder}
              />
            </View>

            <Pressable
              testID="row-audio-speed"
              accessibilityRole="button"
              onPress={() => setSheet('speed')}
              style={[styles.row, { borderBottomWidth: 0 }]}
            >
              <RowText label="發音速度" sub="測驗時的播放速度" />
              <Value text={audioSpeed === 'slow' ? '慢速' : '一般'} />
            </Pressable>
          </View>
        </Section>

        <Section title="資料">
          <Card>
            <Text style={{ fontSize: 14, lineHeight: 22, color: t.muted }}>
              學習紀錄只存在這支手機上，不需要註冊帳號。
            </Text>
          </Card>
        </Section>

        <Section title="關於">
          <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={rowStyle}>
              <Text style={{ fontSize: 15, color: t.text, flex: 1 }}>{appName}</Text>
              <Text testID="about-version" style={{ fontSize: 14, color: t.muted }}>
                版本 {version}
              </Text>
            </View>
            <Pressable
              testID="row-next"
              accessibilityRole="button"
              onPress={() => router.push('/next')}
              style={rowStyle}
            >
              <Text style={{ fontSize: 15, color: t.text }}>下一步：壽司日檢</Text>
              <Icon name="chevronRight" size={16} color={t.muted} />
            </Pressable>
            {graduated ? (
              <Pressable
                testID="row-graduate"
                accessibilityRole="button"
                onPress={() => router.push('/graduate')}
                style={rowStyle}
              >
                <Text style={{ fontSize: 15, color: t.text }}>畢業紀念</Text>
                <Icon name="chevronRight" size={16} color={t.muted} />
              </Pressable>
            ) : null}
            <View style={[styles.aboutRow, { borderBottomColor: t.line }]}>
              <Text style={{ fontSize: 15, color: t.text }}>筆順資料</Text>
              <Text style={{ fontSize: 13, lineHeight: 20, color: t.muted }}>
                KanjiVG（Ulrich Apel），CC BY-SA 3.0
              </Text>
            </View>
            <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
              <Text style={{ fontSize: 15, color: t.text }}>發音</Text>
              <Text style={{ fontSize: 13, lineHeight: 20, color: t.muted }}>
                音檔為 Microsoft Edge TTS 合成
              </Text>
            </View>
          </View>
        </Section>

        {DebugMenu ? <DebugMenu /> : null}
      </ScrollView>

      <OptionSheet
        visible={sheet === 'goal'}
        title="每日目標"
        options={GOAL_OPTIONS}
        selected={String(goal)}
        testIDPrefix="option-goal"
        onClose={() => setSheet(null)}
        onSelect={(v) => {
          setDailyGoalMinutes(Number(v) as Settings['dailyGoalMinutes']);
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'speed'}
        title="發音速度"
        options={SPEED_OPTIONS}
        selected={audioSpeed}
        testIDPrefix="option-speed"
        onClose={() => setSheet(null)}
        onSelect={(v) => {
          setAudioSpeed(v as Settings['audioSpeed']);
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'time'}
        title="提醒時間"
        options={TIME_OPTIONS}
        selected={reminder.time}
        testIDPrefix="option-time"
        onClose={() => setSheet(null)}
        onSelect={pickTime}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, color: t.muted, paddingLeft: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

function RowText({ label, sub }: { label: string; sub: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 2, flexShrink: 1 }}>
      <Text style={{ fontSize: 15, color: t.text }}>{label}</Text>
      <Text style={{ fontSize: 12, color: t.muted }}>{sub}</Text>
    </View>
  );
}

function Value({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={styles.value}>
      <Text style={{ fontSize: 14, color: t.muted }}>{text}</Text>
      <Icon name="chevronRight" size={16} color={t.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 18 },
  themeGroup: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    padding: 4,
  },
  themeBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: {
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
  },
  rowTextPress: { flex: 1, minHeight: 44, justifyContent: 'center' },
  value: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aboutRow: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 2,
    borderBottomWidth: 1,
  },
});
