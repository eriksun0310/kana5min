# 後台可以先建立的項目

這些項目只跟已確定的商業模式有關，不需要等 App 做完。

## App Store Connect

1. 在 Certificates, Identifiers & Profiles 新增 App ID：`com.ptalk.kana5min`，勾選 In-App Purchase。
2. 在 App Store Connect 新增 App，名稱「Kana 5min - 五十音入門」，主要語言繁體中文，選擇上面的 Bundle ID。
3. 在「App 內購買項目」新增非消耗型項目：產品 ID `com.ptalk.kana5min.punpack`，價格 NT$90，文字見 app-store.md。
4. 確認付費 App 協議（Paid Apps Agreement）仍有效。

## Google Play Console

1. 建立應用程式「Kana 5min - 五十音入門」，預設語言繁體中文，類型為應用程式、免費。
2. 應用程式內產品需要先上傳一個含 Billing 權限的版本才能建立，所以這一步等第一個 Android 版本上傳到內部測試後再做：產品 ID `com.ptalk.kana5min.punpack`，價格 NT$90。

## RevenueCat

1. 新增專案 Kana 5min，加入 iOS App（Bundle ID `com.ptalk.kana5min`）與 Android App（套件名稱 `com.ptalk.kana5min`）。
2. 建立 entitlement `pun_pack`。
3. 建立 product `com.ptalk.kana5min.punpack`，綁定到 `pun_pack`。
4. 建立預設 offering，放入這個 product。
5. 把 iOS 與 Android 的 public SDK key 填進專案的 `.env`（`EXPO_PUBLIC_RC_IOS_KEY`、`EXPO_PUBLIC_RC_ANDROID_KEY`）。

## AdMob

1. 新增兩個應用程式：iOS 與 Android 各一個，名稱 Kana 5min。
2. 每個應用程式各建立兩個廣告單元：橫幅（Banner）與插頁式（Interstitial）。
3. 把 App ID 與四個廣告單元 ID 填進 `.env`，變數名稱以 Claude Code 產生的 `.env.example` 為準。
4. 在「隱私權與訊息」建立 GDPR 與 IDFA 說明訊息，供 UMP 同意表單使用。
