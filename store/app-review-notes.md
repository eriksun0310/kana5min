# App Review Notes（貼到 App Store Connect → App 審查資訊 → 備註）

> 回覆 Apple 2026-11-05 的 Guideline 2.1 Information Needed。下面「正文」整段貼進備註欄（英文，約 3,900 字元，備註上限 4,000）。
> 錄影（第 1 項）要你用實機錄，錄好後一起附在備註欄的「附件」，或放雲端並把連結貼在備註最前面。錄影腳本在檔案最下面。
> 貼之前請確認：RevenueCat/AdMob 等描述與現況一致；若之後有改動外部服務，要同步改這份。

## 正文（貼這段）

```
SCREEN RECORDING
A screen recording on a physical iPhone is attached. It starts from launching the app from the Home Screen and shows the typical flow: the intro, learning a new kana (audio, stroke order, tracing), the kana chart with the locked/unlocked mnemonic overview, Settings, the "Fun Memory Pack" paywall, and tapping Buy.
Note: the test account had already purchased the Fun Memory Pack in the sandbox/TestFlight environment before recording. Because it is a non-consumable product, tapping Buy completes immediately (the App Store reports it as already owned and the app shows "Purchase successful") without showing the payment sheet again. For an account that has not purchased it, tapping Buy shows the standard App Store payment sheet; you can verify this with your own sandbox account (Settings > Fun Memory Pack > Buy).

1. PURPOSE AND TARGET AUDIENCE
"Kana 5min" (display name 諧音五十音) helps people who are starting Japanese from zero learn hiragana and katakana. Beginners struggle to remember the 46 basic kana. The app teaches a few new characters per day (about 5 minutes) with audio, stroke order, tracing and short quizzes, and adds a Traditional Chinese (Taiwan) sound-alike mnemonic for each kana to make it easier to remember. The audience is Traditional Chinese speakers (mainly in Taiwan) who are new to Japanese. The app works offline and has no accounts.

2. HOW TO ACCESS THE MAIN FEATURES
No login, account or sample files are needed. There is no account creation, no user-generated content and no social features, so there is nothing to report or block.
- First launch: a short intro; tap "Next" or "Skip".
- Home tab: tap today's lesson to learn the next kana (listen, stroke order, trace, quiz).
- Chart tab: all kana; tap one for audio, stroke animation and its mnemonic.
- Practice tab: quizzes.
- Settings tab: theme, daily reminder, About, Restore Purchases.

3. IN-APP PURCHASE (PAID FEATURE)
One non-consumable In-App Purchase: "好笑記憶包" (Fun Memory Pack), product ID com.ptalk.kana5min.punpack. The a-row and ka-row mnemonics and all other features are free. The mnemonics for the remaining kana can be unlocked two ways:
(a) Free: tap a locked mnemonic card and choose to watch an ad (Google AdMob rewarded video; each ad unlocks 3 sounds).
(b) Paid: tap Buy (also in Settings > Fun Memory Pack). This unlocks all mnemonics and removes ads permanently. Restore Purchases is on the same screen.
To test: Settings > 好笑記憶包, tap the price button, and complete the purchase with a sandbox account.

4. EXTERNAL SERVICES USED
- RevenueCat: manages the In-App Purchase entitlement; anonymous app user ID, no account.
- Google AdMob: rewarded video ads only, always non-personalized. No App Tracking Transparency, no cross-app tracking.
- A self-hosted over-the-air update server (ota.moushih.com, expo-updates client) that delivers JavaScript bug-fix updates only; no accounts or personal information are collected.
- Local notifications: an optional daily study reminder on the device (no push server).
- Bundled content: pre-generated audio files (no runtime AI or speech service), stroke-order data from KanjiVG (CC BY-SA 3.0, credited in Settings > About), and the Klee One font.
- No analytics SDK, no login service and no AI service at runtime.

5. REGIONAL DIFFERENCES
The app works the same in all regions. The interface and mnemonics are in Traditional Chinese everywhere; only the In-App Purchase price is shown in local currency by the App Store.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not a regulated industry. The only third-party material is open-licensed (KanjiVG stroke data, Klee One font), both credited in the app.
```

## 錄影腳本（實機，約 2 到 3 分鐘）

1. 先把 App 刪掉重裝（或 TestFlight 重裝），錄影從「點 App 圖示啟動」開始。
2. 看完引導頁 → 進首頁 → 學今天的字（聽發音、看筆順、描寫、小測驗）。
3. 進「五十音表」→ 點任一個字看詳情與諧音梗卡片。
4. 點一個被鎖住的諧音卡（さ行以後）→ 解鎖面板 → 示範「看廣告解鎖」（可播完一支）。
5. 進「設定 → 好笑記憶包」→ 新版付費牆 → 點價格按鈕，讓 Apple 購買視窗跳出來（用沙盒帳號完成購買，或到視窗後取消）→ 回到付費牆點「恢復購買」。
6. 回設定頁，示範主題切換與每日提醒開關。
7. 錄影用實機的「螢幕錄製」，不要剪接；若用沙盒購買，不會真的扣款。

## 回覆 Apple 時
備註欄貼好正文並附錄影後，按「重新送交審查」（由你按）。不需要另外在 Resolution Center 回訊息，除非想補一句說明。
