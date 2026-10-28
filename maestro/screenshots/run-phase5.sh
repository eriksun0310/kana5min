#!/bin/zsh
# 重新截 好笑記憶包（F1～F4、設定頁） 亮色與暗色，輸出到 screenshots/phase5/。
# 用法：maestro/screenshots/run-phase5.sh [UDID]
# 前提：模擬器已開機、debug 版 App 已安裝、Metro 在跑。
set -e
cd "$(dirname "$0")/../.."
UDID="${1:-DD084577-9D07-4724-A199-30B4B0F0DD94}"
MAESTRO=/Users/jiayu/.maestro/bin/maestro
OUT=screenshots/phase5
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for theme in light dark; do
  xcrun simctl ui "$UDID" appearance "$theme"
  sleep 1
  "$MAESTRO" --device "$UDID" test -e THEME="$theme" \
    --flatten-debug-output --debug-output="$TMP/$theme" \
    maestro/screenshots/phase5-capture.yaml
  find "$TMP/$theme" -path '*screenshots/phase5/*.png' -exec cp {} "$OUT"/ \;
done
xcrun simctl ui "$UDID" appearance light
rm -rf "$TMP"
