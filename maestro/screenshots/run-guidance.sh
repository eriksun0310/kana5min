#!/bin/zsh
# 截引導改版的畫面，亮色與暗色，輸出到 screenshots/guidance/（狀態列固定 9:41）。
# 用法：maestro/screenshots/run-guidance.sh [UDID]
# 前提：模擬器已開機、debug 版 App 已安裝、Metro 在跑。
set -e
cd "$(dirname "$0")/../.."
UDID="${1:-6E05D479-2920-406D-95EC-9AF785F8A62A}"
MAESTRO=/Users/jiayu/.maestro/bin/maestro
OUT=screenshots/guidance
TMP="$(mktemp -d)"
mkdir -p "$OUT"
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularMode active --cellularBars 4 --wifiBars 3
for theme in light dark; do
  xcrun simctl ui "$UDID" appearance "$theme"
  sleep 1
  "$MAESTRO" --device "$UDID" test -e THEME="$theme" \
    --flatten-debug-output --debug-output="$TMP/$theme" \
    maestro/screenshots/guidance-capture.yaml
  find "$TMP/$theme" -path '*screenshots/guidance/*.png' -exec cp {} "$OUT"/ \;
done
xcrun simctl ui "$UDID" appearance light
xcrun simctl status_bar "$UDID" clear
rm -rf "$TMP"
echo GUIDANCE_DONE
