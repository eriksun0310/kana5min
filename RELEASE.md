# 諧音五十音發佈流程

> 本專案使用 **Expo SDK 58 + EAS Build（本機 `--local`）**。
> 版本號由 EAS 遠端管理（`eas.json` 的 `appVersionSource: "remote"` + `autoIncrement`），
> **每次 production build 會自動遞增** iOS buildNumber／Android versionCode，不用手動改。
>
> 套件管理器：npm（`npm run <script>`）。
> 前置：本機已裝 Xcode、CocoaPods、Android SDK（`ANDROID_HOME`）、JDK 17 以上。
> EAS CLI 不用全域安裝，下面的 npm script 會透過 `npx` 執行（或自行 `npm i -g eas-cli`）。
>
> 本專案沒有裝 `expo-updates`（沒有 OTA 熱更），也沒有 dev client；所有變更都要重新 build 上架。

---

## 🆕 第一次 build 前（只做一次）

```bash
npx eas-cli login
```

```bash
npx eas-cli init
```

> `eas init` 會建立 EAS 專案，並把 `extra.eas.projectId` 寫進 `app.json`，記得 commit。
> 第一次 build 時 EAS 會問「要不要用 app.json 的版本號初始化遠端版本」，選 **Yes**。

設定正式版用的公開 ID（只做一次；值不要寫進任何檔案或 commit）。`--local` build 不會讀專案的 `.env`，要放在 EAS 環境變數：

```bash
npx eas-cli env:create --environment production --visibility plaintext --name EXPO_PUBLIC_RC_IOS_KEY --value <RevenueCat iOS 公開 key>
```

同樣方式再建 `EXPO_PUBLIC_RC_ANDROID_KEY`、`EXPO_PUBLIC_ADMOB_REWARDED_IOS`、`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`。
沒設的話 App 仍可正常使用，只是買斷與看廣告會顯示「暫時無法使用」。

上架前確認：

- [ ] `app.json` 的 `name`（手機桌面顯示的名稱）跟商店後台的 App 名稱一致
- [ ] App 圖示（`assets/images/icon.png`、`android-icon-*.png`）已換成正式圖
- [ ] `src/config.ts` 的壽司日檢商店連結已填
- [ ] 上面四個 EAS 環境變數已設定
- [ ] `npm run typecheck` 乾淨、`npm test` 全過

---

## 🍎 iOS App Store 發佈流程

### 步驟 1：更新顯示版本（只在要升版時才改）

改 `app.json` 的 `expo.version`（例如 `1.0.0` → `1.1.0`），buildNumber 由 EAS 自動 +1。

### 步驟 2：Build IPA（本機）

```bash
npm run build:ios
```

> 對應 `eas build --platform ios --profile production --local`。
> 第一次會要求登入 Apple 帳號，讓 EAS 建立 Distribution 憑證與 Provisioning Profile（之後存在 EAS，不用再登入）。
> 約需 10–20 分鐘，完成後 `build-<timestamp>.ipa` 輸出在專案根目錄。

### 步驟 3：上傳到 App Store Connect

打開 **Transporter** App，拖入 `.ipa`，點「傳送」。

> 或用指令：`npx eas-cli submit --platform ios --path ./build-*.ipa`

### 步驟 4：TestFlight 測試／送審

1. 登入 [App Store Connect](https://appstoreconnect.apple.com)，等 build 處理完成（約 5–30 分鐘）
2. **TestFlight** 分頁 → 把自己加進內部測試群組 → 手機用 TestFlight App 安裝
3. 要上架：App Store 分頁 → 新增版本 → 選剛上傳的 build → 填「此版本的新增內容」→ 送出審查

---

<br>

## 🤖 Android Play Store 發佈流程

### 步驟 1：更新顯示版本（同 iOS，改過就跳過）

### 步驟 2：Build AAB（本機）

```bash
npm run build:android:aab
```

> 對應 `eas build --platform android --profile production --local`（`buildType: app-bundle`）。
> 第一次會問要不要讓 EAS 產生 upload keystore，選 **Yes**（keystore 存在 EAS，之後每次 build 共用）。
> 約需 10–20 分鐘，完成後 `build-<timestamp>.aab` 輸出在專案根目錄。
> Play Store 上架必須用 `.aab`（不是 `.apk`）。

### 步驟 3：上傳到 Play Console

1. 登入 [Google Play Console](https://play.google.com/console)
2. 選擇 App → **測試 → 內部測試**（第一次建議先走內部測試）或 **正式版**
3. 點 **「建立新版本」** → 上傳 `.aab`
4. 填寫「此版本的新增內容」
5. **「儲存」→「審查版本」→「開始推出」**

> ⚠️ Play 的**第一個版本必須在 Play Console 網頁手動上傳**，之後才能用指令：
> `npx eas-cli submit --platform android --path ./build-*.aab`
> （用指令上傳需要 Google Service Account 金鑰，依 EAS CLI 提示設定；金鑰不要放進 repo。）

---

<br>

## 📱 Android 本地測試流程（APK + USB）

把 App 裝到實體 Android 手機測試，**不會上架商店**。

### 步驟 1：Build APK

```bash
npm run build:android:apk
```

> 對應 `production-apk` profile（`buildType: apk`、不遞增 versionCode）。
> 完成後 `build-<timestamp>.apk` 輸出在專案根目錄。

### 步驟 2：手機端設定（第一次才需要）

1. 設定 → 關於手機 → 連按「版本號」7 次，開啟**開發者選項**
2. 設定 → 開發者選項 → 開啟 **USB 偵錯**
3. USB 連接 Mac，手機跳出「允許 USB 偵錯？」時按**允許**

### 步驟 3：確認手機被識別

```bash
adb devices
```

> 若顯示 `unauthorized`，重新拔插 USB 並在手機上按「允許」。

### 步驟 4：安裝 APK

```bash
adb install -r ./build-*.apk
```

遇到 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`（簽名不同，例如手機上是從 Play 裝的版本），先解除再裝：

```bash
adb uninstall com.ptalk.kana5min
```

---

<br>

## 🧪 模擬器開發與測試

```bash
npm start
```

```bash
npm run ios
```

> `npm run ios` = `expo run:ios`，會編譯並裝到 iOS 模擬器。
> Maestro 流程：Metro 開著時跑 `maestro test maestro/`（詳見 `PROGRESS.md`）。
> 啟動 Metro 前若 CocoaPods 報編碼錯誤，先 `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`。

---

<br>

## 🧹 清理舊 build 產物

`.ipa`／`.aab`／`.apk` 都輸出在專案根目錄（已在 `.gitignore`），上傳商店後本地副本就不用留：

```bash
rm -f build-*.ipa build-*.aab build-*.apk
```

> 需要舊版 binary 時，到 App Store Connect（TestFlight build 列表）或 Play Console（App Bundle 瀏覽工具）下載。

---

<br>

## 📋 速查表

| 目的 | 指令 |
|------|------|
| iOS 上架（IPA） | `npm run build:ios` |
| Android 上架（AAB） | `npm run build:android:aab` |
| Android 實機測試（APK） | `npm run build:android:apk` |
| iOS 上傳（指令版） | `npx eas-cli submit --platform ios --path ./build-*.ipa` |
| 重新產生原生專案（改了 icon／splash／名稱／權限） | `npm run prebuild` |
| 啟動開發 Metro | `npm start` |
| 型別檢查／單元測試 | `npm run typecheck`／`npm test` |
| 清舊 build 檔 | `rm -f build-*.ipa build-*.aab build-*.apk` |

> `ios/`、`android/` 在 `.gitignore` 內，EAS build 會自己重新 prebuild，
> 所以改了 icon、名稱等 native 設定後直接 build 就會生效；`npm run prebuild` 只影響本機模擬器用的原生專案。
