#!/bin/zsh
# 截實機回報的修正畫面，亮色與暗色，輸出到 screenshots/ui-fixes/。
# 用法：maestro/screenshots/run-ui-fixes.sh [UDID]
# 前提：模擬器已開機、debug 版 App 已安裝、Metro 在跑。
set -e
cd "$(dirname "$0")/../.."
UDID="${1:-6E05D479-2920-406D-95EC-9AF785F8A62A}"
MAESTRO=/Users/jiayu/.maestro/bin/maestro
OUT=screenshots/ui-fixes
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for theme in light dark; do
  xcrun simctl ui "$UDID" appearance "$theme"
  sleep 1
  "$MAESTRO" --device "$UDID" test -e THEME="$theme" \
    --flatten-debug-output --debug-output="$TMP/$theme" \
    maestro/screenshots/ui-fixes-capture.yaml
  find "$TMP/$theme" -path '*screenshots/ui-fixes/*.png' -exec cp {} "$OUT"/ \;
done
xcrun simctl ui "$UDID" appearance light
rm -rf "$TMP"
