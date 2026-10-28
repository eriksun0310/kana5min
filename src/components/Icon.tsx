import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

// 圖示路徑取自設計檔（24×24 viewBox，stroke 單色、strokeWidth 2、圓角線頭）。
// 見 docs/architecture.md 第 7 節。畫面上不使用 emoji。

export type IconName =
  | 'flame'
  | 'home'
  | 'grid'
  | 'practice'
  | 'settings'
  | 'back'
  | 'chevronRight'
  | 'speaker'
  | 'speakerSmall'
  | 'slow'
  | 'close'
  | 'replay'
  | 'check'
  | 'lock'
  | 'share';

const SPEAKER_BODY = 'M4 9v6h4l5 4V5L8 9z';

function glyph(name: IconName): React.ReactNode {
  switch (name) {
    case 'flame':
      return <Path d="M12 3c1 3 4 4.5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s.5 2 2 2c0-3-1-5 1-8z" />;
    case 'home':
      return <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />;
    case 'grid':
      return (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1.5} />
          <Rect x={14} y={3} width={7} height={7} rx={1.5} />
          <Rect x={3} y={14} width={7} height={7} rx={1.5} />
          <Rect x={14} y={14} width={7} height={7} rx={1.5} />
        </>
      );
    case 'practice':
      return (
        <>
          <Path d="M9 11l3 3 8-8" />
          <Path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={3} />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
        </>
      );
    case 'back':
      return <Path d="M15 18l-6-6 6-6" />;
    case 'chevronRight':
      return <Path d="M9 6l6 6-6 6" />;
    case 'speaker':
      return (
        <>
          <Path d={SPEAKER_BODY} />
          <Path d="M16 9a4 4 0 0 1 0 6" />
          <Path d="M18.5 6.5a8 8 0 0 1 0 11" />
        </>
      );
    case 'speakerSmall':
      return (
        <>
          <Path d={SPEAKER_BODY} />
          <Path d="M16 9a4 4 0 0 1 0 6" />
        </>
      );
    case 'slow':
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M10 9l5 3-5 3z" />
        </>
      );
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" />;
    case 'replay':
      return (
        <>
          <Path d="M3 12a9 9 0 1 0 3-6.7" />
          <Path d="M3 4v5h5" />
        </>
      );
    case 'check':
      return <Path d="M5 12l5 5 9-10" />;
    case 'lock':
      return (
        <>
          <Rect x={5} y={11} width={14} height={10} rx={2} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      );
    case 'share':
      return (
        <>
          <Path d="M12 15V3M8 7l4-4 4 4" />
          <Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </>
      );
  }
}

export interface IconProps {
  name: IconName;
  size?: number;
  /** 預設為主題的 text 色 */
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps) {
  const t = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? t.text}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyph(name)}
    </Svg>
  );
}
