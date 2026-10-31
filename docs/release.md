# 發布與開發流程

## 一、Dev Client（裝在實體 iPhone，改 code 即時更新）

用途：把「開發版 App」裝到實體 iPhone，之後改程式只要開 Metro、手機連上就會載到最新的，不用重新打包。
用本機打包（不經過 EAS 雲端）。`eas.json` 裡 `development` 是給**模擬器**用的，實體機要用 **`development-device`**
（`developmentClient: true`）。

### 前置條件（第一次才需要）

1. 已登入 EAS：`pnpm exec eas whoami`（沒登入用 `pnpm exec eas login`）。
2. 這台 Mac 有 Xcode、CocoaPods、fastlane（打包時 EAS CLI 會檢查並提示安裝），並有可用的簽名憑證：
   `security find-identity -v -p codesigning` 要看到 `Apple Development: …`。
3. 測試用 iPhone 的 UDID 已註冊進 Apple Developer 帳號、並包含在 provisioning profile。
   第一次打包時 EAS CLI 會引導（要輸入 Apple 帳號與密碼，必須由本人輸入）。
4. iPhone 開啟**開發者模式**：設定 → 隱私權與安全性 → 開發者模式 → 開啟（手機會重新啟動）。

### 步驟 1：打包 Dev Client（只要打一次）

```bash
cd /Users/jiayu/Desktop/kana5min
pnpm build:ios:dev
```

等於 `eas build --platform ios --profile development-device --local`。約 10～20 分鐘，完成後 `.ipa` 輸出在專案根目錄
（檔名 `build-<時間戳>.ipa`）。

確認這個 ipa 是開發版、而且簽名包含你的手機：

```bash
ls -t build-*.ipa | head -1
unzip -l "$(ls -t build-*.ipa | head -1)" | grep -ci "EXDevLauncher"          # 要 > 0
unzip -p "$(ls -t build-*.ipa | head -1)" 'Payload/*.app/embedded.mobileprovision' | strings | grep -c "<你的 UDID>"   # 要 ≥ 1
```

### 步驟 2：iPhone 接上 Mac

用 USB 傳輸線接上、手機解鎖、跳出「要信任這部電腦嗎」按**信任**。確認 Mac 看到手機：

```bash
xcrun devicectl list devices
```

你的手機那一列要是 `available (paired)` 或 `connected`。`unavailable` 代表沒接上（常見：線只能充電、
手機沒解鎖、沒按信任、沒開開發者模式）。裝置編號（UDID）就在這一列。

### 步驟 3：安裝到 iPhone

```bash
xcrun devicectl device install app --device <UDID> "$(ls -t build-*.ipa | head -1)"
```

看到 `App installed` 就成功。不需要開 Xcode 的 Devices and Simulators（新版 Xcode 的 Window 選單可能沒有這一項）。
其他方式：Xcode → Window → Devices and Simulators 把 ipa 拖進「Installed Apps」；或 Apple Configurator 2 → 加入 → 應用程式。

第一次安裝後，手機要信任開發者：設定 → 一般 → VPN 與裝置管理 → 你的開發者帳號 → 信任。

### 步驟 4：日常開發（不用再打包）

```bash
cd /Users/jiayu/Desktop/kana5min
pnpm exec expo start --dev-client
```

手機和 Mac 連**同一個 Wi-Fi**，打開手機上的開發版 App，點它列出的伺服器（或用相機掃終端機的 QR code；
沒列出來就選「Enter URL manually」輸入 `http://<Mac 的 IP>:8081`，IP 用 `ipconfig getifaddr en0` 查）。
第一次連線 iOS 會問「要允許找到區域網路上的裝置嗎」，按**允許**。之後改程式會即時更新（Fast Refresh）。

畫面還是舊的、或剛改的沒出現時：把手機上的 App 從多工畫面滑掉重開；還是不行就清快取重開 Metro：

```bash
pnpm exec expo start --dev-client --clear
```

### 常見問題

| 狀況 | 原因與處理 |
|---|---|
| `error 4016` / `device is not able to fulfill the requested usage assertion` | Mac 連不到手機（`unavailable`）。換線或 USB 孔、解鎖、按信任、開開發者模式，再用 `xcrun devicectl list devices` 確認。 |
| `Port 8081 is being used` | 還有別的 Metro 在跑：`lsof -ti :8081 \| xargs kill`。 |
| App 打開後打不開、閃退 | 手機沒信任開發者憑證，或手機的 UDID 沒註冊進這次打包用的描述檔（要重新打包）。 |
| 程式改了手機沒變 | 手機沒連到你的 Metro（Metro 終端機看不到手機的連線），或載到舊的 bundle；見步驟 4。 |
| 手機要換成另一支 | 新手機的 UDID 要先註冊並重新打包，再裝新的 ipa。 |

## 二、模擬器（給 Maestro 測試用）

模擬器用 `development` profile 或 `pnpm exec expo run:ios`；Debug 版只連 `localhost:8081`，所以跑 Maestro 時只能有一個
Metro 在 8081。流程檔在 `maestro/`，截圖腳本在 `maestro/screenshots/`。

## 三、正式版（上架用）

```bash
pnpm build:ios           # eas build --platform ios --profile production --local
pnpm build:android:aab   # eas build --platform android --profile production --local
pnpm build:android:apk   # 內部測試用 apk
```

專案規則（CLAUDE.md）：不執行 `eas submit`、不要把金鑰寫進程式或設定檔（RevenueCat 的 key 用 `eas env:set` 設定）。
上傳 App Store Connect／Google Play 由人手動操作。商店上架步驟與檢查清單見團隊的上架 SOP（`appstore-submission-sop`）。
