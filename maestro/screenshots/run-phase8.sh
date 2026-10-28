#!/bin/zsh
# 重新截 提醒詢問卡與看字選音揭曉 亮色與暗色，輸出到 screenshots/phase8/。
# 用法：maestro/screenshots/run-phase8.sh [UDID]
# 前提：模擬器已開機、debug 版 App 已安裝、Metro 在跑。
set -e
cd "$(dirname "$0")/../.."
UDID="${1:-DA7DC63F-C945-4231-AED4-863CE19F1AD7}"
MAESTRO=/Users/jiayu/.maestro/bin/maestro
OUT=screenshots/phase8
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for theme in light dark; do
  xcrun simctl ui "$UDID" appearance "$theme"
  sleep 1
  "$MAESTRO" --device "$UDID" test -e THEME="$theme" \
    --flatten-debug-output --debug-output="$TMP/$theme" \
    maestro/screenshots/phase8-capture.yaml
  find "$TMP/$theme" -path '*screenshots/phase8/*.png' -exec cp {} "$OUT"/ \;
done
xcrun simctl ui "$UDID" appearance light
rm -rf "$TMP"
