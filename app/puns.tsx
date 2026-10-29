import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BackHeader, Icon, KanaText, PunCard, PunUnlockSheet, Screen } from '../src/components';
import { byId, kanaOfKind, punOfSound, seionGrid, soundOf, type KanaKind, type Script } from '../src/data';
import { isKatakanaUnlocked } from '../src/logic/confusion';
import { isPunUnlocked } from '../src/logic/punUnlock';
import { useProgressStore, useSettingsStore } from '../src/store';
import { useBottomPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

const SCRIPTS: { script: Script; label: string }[] = [
  { script: 'hiragana', label: '平假名' },
  { script: 'katakana', label: '片假名' },
];

const KINDS: { kind: KanaKind; label: string }[] = [
  { kind: 'seion', label: '清音' },
  { kind: 'dakuon', label: '濁音・半濁音' },
  { kind: 'youon', label: '拗音' },
];

const GAP = 5;
const SIDE = 24;
const COLS = 5;

/**
 * F4 好笑記法總覽：清音 46 格照五十音表排法，另有濁音・半濁音、拗音分頁（沒有句子的格子標「—」）；
 * 已解鎖點開看句子，未解鎖點開解鎖面板。
 */
export default function PunsScreen() {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(24);
  const { width } = useWindowDimensions();
  const progress = useProgressStore((s) => s.progress);
  const purchased = useSettingsStore((s) => s.punPackPurchased);
  const unlockedSounds = useSettingsStore((s) => s.punUnlocked);
  const [script, setScript] = useState<Script>('hiragana');
  const [kind, setKind] = useState<KanaKind>('seion');
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetSound, setSheetSound] = useState<string | null>(null);

  const kataUnlocked = useMemo(() => isKatakanaUnlocked(Object.values(progress)), [progress]);
  const shownScript: Script = kataUnlocked ? script : 'hiragana';
  const prefix = shownScript === 'katakana' ? 'k' : 'h';

  const cells = useMemo(
    () => (kind === 'seion' ? seionGrid(shownScript) : kanaOfKind(kind, shownScript).map((k) => k.id)),
    [kind, shownScript],
  );
  const rows = useMemo(() => {
    const out: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += COLS) out.push(cells.slice(i, i + COLS));
    return out;
  }, [cells]);
  const cellWidth = (width - SIDE * 2 - GAP * (COLS - 1)) / COLS;

  const changeKind = (next: KanaKind) => {
    setKind(next);
    setSelected(null);
  };

  const onCell = (sound: string) => {
    if (isPunUnlocked(sound, { purchased, unlocked: unlockedSounds })) setSelected(sound);
    else {
      setSelected(null);
      setSheetSound(sound);
    }
  };

  return (
    <Screen>
      <BackHeader title="好笑記法總覽" onBack={() => router.back()} />

      {kataUnlocked ? (
        <View style={styles.switchRow}>
          <View style={[styles.segment, { backgroundColor: t.chip }]}>
            {SCRIPTS.map((s) => {
              const on = s.script === shownScript;
              return (
                <Pressable
                  key={s.script}
                  testID={`puns-script-${s.script}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  hitSlop={{ top: 5, bottom: 5 }}
                  onPress={() => setScript(s.script)}
                  style={[styles.segBtn, on && { backgroundColor: t.surface }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: on ? '700' : '400', color: on ? t.text : t.muted }}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.kinds}>
        {KINDS.map((k) => {
          const on = k.kind === kind;
          return (
            <Pressable
              key={k.kind}
              testID={`puns-kind-${k.kind}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              hitSlop={{ top: 3, bottom: 3 }}
              onPress={() => changeKind(k.kind)}
              style={[
                styles.kindBtn,
                { borderColor: on ? t.text : t.line, backgroundColor: on ? t.text : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? t.bg : t.muted }}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((id, ci) => {
              const k = id ? byId(id) : undefined;
              if (!k) return <View key={ci} style={{ width: cellWidth, height: 46 }} />;
              const sound = soundOf(k.id) ?? '';
              const hasPun = punOfSound(sound) !== undefined;
              const open = hasPun && isPunUnlocked(sound, { purchased, unlocked: unlockedSounds });
              const on = selected === sound;
              // 沒有諧音的格子不顯示（留空位，格子位置不變）
              if (!hasPun) return <View key={ci} style={{ width: cellWidth, height: 46 }} />;
              return (
                <Pressable
                  key={ci}
                  testID={`puns-cell-${sound}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${k.char}，${open ? '已解鎖' : '未解鎖'}`}
                  onPress={() => onCell(sound)}
                  style={[
                    styles.cell,
                    {
                      width: cellWidth,
                      backgroundColor: t.surface,
                      borderColor: on ? t.accent : t.line,
                    },
                  ]}
                >
                  <KanaText size={22} lineHeightRatio={1.2} color={t.text}>
                    {k.char}
                  </KanaText>
                  {open ? (
                    <View testID={`puns-open-${sound}`} style={[styles.dot, { backgroundColor: t.accent }]} />
                  ) : (
                    <View style={styles.lock}>
                      <Icon name="lock" size={11} color={t.muted} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.panel, { paddingBottom: bottom }]}>
        {selected ? (
          <PunCard kanaId={`${prefix}-${selected.startsWith('h-') ? selected.slice(2) : selected}`} />
        ) : (
          <Text style={[styles.footer, { color: t.muted }]}>點已解鎖的字看諧音梗，點鎖頭的字可以解鎖</Text>
        )}
      </View>

      {sheetSound ? (
        <PunUnlockSheet
          visible
          sound={sheetSound}
          script={shownScript}
          onClose={() => setSheetSound(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { paddingHorizontal: SIDE, paddingTop: 10, alignItems: 'flex-start' },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kinds: { flexDirection: 'row', gap: 8, paddingHorizontal: SIDE, paddingTop: 12 },
  kindBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { paddingHorizontal: SIDE, paddingTop: 14, paddingBottom: 8, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  cell: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', right: 5, top: 5, width: 6, height: 6, borderRadius: 3 },
  lock: { position: 'absolute', right: 4, top: 4 },
  panel: { paddingHorizontal: SIDE, paddingTop: 8 },
  footer: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});
