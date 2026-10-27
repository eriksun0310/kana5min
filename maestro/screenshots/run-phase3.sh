#!/bin/zsh
# 重新截 C2-18～C2-20 與片假名首頁、五十音表 亮色與暗色，輸出到 screenshots/phase3/。
# 用法：maestro/screenshots/run-phase3.sh [UDID]
# 前提：模擬器已開機、debug 版 App 已安裝、Metro 在跑。
set -e
cd "$(dirname "$0")/../.."
UDID="${1:-DD084577-9D07-4724-A199-30B4B0F0DD94}"
MAESTRO=/Users/jiayu/.maestro/bin/maestro
OUT=screenshots/phase3
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for theme in light dark; do
  xcrun simctl ui "$UDID" appearance "$theme"
  sleep 1
  "$MAESTRO" --device "$UDID" test -e THEME="$theme" \
    --flatten-debug-output --debug-output="$TMP/$theme" \
    maestro/screenshots/phase3-capture.yaml
  find "$TMP/$theme" -path '*screenshots/phase3/*.png' -exec cp {} "$OUT"/ \;
done
xcrun simctl ui "$UDID" appearance light
rm -rf "$TMP"
