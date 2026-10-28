#!/bin/zsh
# 重新截 新手教學（導覽、首頁說明、提示氣泡） 亮色與暗色，輸出到 screenshots/phase7/。
# 用法：maestro/screenshots/run-phase7.sh [UDID]
# 前提：模擬器已開機、debug 版 App 已安裝、Metro 在跑。
set -e
cd "$(dirname "$0")/../.."
UDID="${1:-6E05D479-2920-406D-95EC-9AF785F8A62A}"
MAESTRO=/Users/jiayu/.maestro/bin/maestro
OUT=screenshots/phase7
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for theme in light dark; do
  xcrun simctl ui "$UDID" appearance "$theme"
  sleep 1
  "$MAESTRO" --device "$UDID" test -e THEME="$theme" \
    --flatten-debug-output --debug-output="$TMP/$theme" \
    maestro/screenshots/phase7-capture.yaml
  find "$TMP/$theme" -path '*screenshots/phase7/*.png' -exec cp {} "$OUT"/ \;
done
xcrun simctl ui "$UDID" appearance light
rm -rf "$TMP"
