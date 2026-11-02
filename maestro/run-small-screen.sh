#!/bin/zsh
# 在 iPhone SE（矮螢幕）上跑一批會用到版面的流程：選項不能被底部按鈕蓋住、按鈕要點得到。
# 用法：maestro/run-small-screen.sh [UDID]
# 前提：Metro 在跑（pnpm exec expo start），模擬器上已裝 debug 版（安裝方式見 docs/release.md 第二節）。
set -e
cd "$(dirname "$0")/.."
UDID="${1:-42F9217D-024C-40E3-B77F-F6932DC45555}"   # iPhone SE (3rd generation)
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
for f in phase12-spot-error phase11-new-quiz-types phase13-drop phase14-dev-auto-answer phase15-guards \
         phase2-auto-practice phase3-loanword phase9-trace phase10-mnemonic phase2-confuse; do
  echo "== $f"
  maestro --udid "$UDID" test "maestro/$f.yaml"
done
