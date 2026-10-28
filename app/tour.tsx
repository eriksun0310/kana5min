import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen } from '../src/components';
import { TOUR_PAGES } from '../src/logic/tour';
import { useSettingsStore } from '../src/store';
import { useTopPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

/**
 * 首次導覽（3 頁，可左右滑動）：首次開啟時在歡迎頁之前顯示；也能從設定「重看教學」進來。
 * 首次：結束或略過後記下 tourSeen 並進歡迎頁；重看（已完成歡迎頁）：結束或略過後回到上一頁。
 */
export default function TourScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const { width } = useWindowDimensions();
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const last = page === TOUR_PAGES.length - 1;

  const finish = () => {
    const s = useSettingsStore.getState();
    const replay = s.onboarded;
    s.setTourSeen(true);
    if (!replay) router.replace('/welcome');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable
          testID="tour-skip"
          accessibilityRole="button"
          onPress={finish}
          style={styles.skip}
        >
          <Text style={{ fontSize: 15, color: t.muted }}>略過</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        <View style={[styles.page, { width }]} testID="tour-content-1">
          <View style={styles.kanaRow}>
            {['あ', 'い', 'う'].map((c) => (
              <KanaText key={c} size={76} lineHeightRatio={1.2}>
                {c}
              </KanaText>
            ))}
          </View>
          <Text style={[styles.title, { color: t.text }]}>{TOUR_PAGES[0].title}</Text>
          <Text style={[styles.desc, { color: t.muted }]}>{TOUR_PAGES[0].desc}</Text>
        </View>

        <View style={[styles.page, { width }]} testID="tour-content-2">
          <KanaText size={120} lineHeightRatio={1.1}>
            く
          </KanaText>
          <Text style={[styles.title, { color: t.text }]}>{TOUR_PAGES[1].title}</Text>
          <View style={[styles.quote, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={{ fontSize: 17, color: t.text }}>你是在く（哭）喔？</Text>
          </View>
          <Text style={[styles.desc, { color: t.muted }]}>{TOUR_PAGES[1].desc}</Text>
        </View>

        <View style={[styles.page, { width }]} testID="tour-content-3">
          <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
            <Icon name="replay" size={56} color={t.accentText} strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { color: t.text }]}>{TOUR_PAGES[2].title}</Text>
          <Text style={[styles.desc, { color: t.muted }]}>{TOUR_PAGES[2].desc}</Text>
          <View style={[styles.tag, { backgroundColor: t.chip }]}>
            <Text style={{ fontSize: 13, color: t.muted }}>每日提醒可以之後在設定開啟</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {TOUR_PAGES.map((p, i) => (
          <View
            key={p.key}
            testID={`tour-page-${i + 1}`}
            accessibilityLabel={`第 ${i + 1} 頁，共 ${TOUR_PAGES.length} 頁`}
            accessibilityState={{ selected: i === page }}
            style={[styles.dot, { backgroundColor: i === page ? t.accent : t.track }]}
          />
        ))}
      </View>

      <View style={styles.cta}>
        {last ? (
          <PrimaryButton label="開始學習" testID="tour-start" onPress={finish} />
        ) : (
          <PrimaryButton label="下一頁" testID="tour-next" onPress={() => goTo(page + 1)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, alignItems: 'flex-end' },
  skip: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, alignItems: 'flex-end', justifyContent: 'center' },
  pager: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  kanaRow: { flexDirection: 'row', gap: 24 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 16, lineHeight: 25, textAlign: 'center' },
  quote: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 14 },
  badge: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  tag: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: { paddingHorizontal: 24, paddingBottom: 44 },
});
