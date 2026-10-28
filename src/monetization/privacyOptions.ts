// 「隱私權選項」入口（UMP）：只在同意資訊指出需要隱私權選項時顯示（例如歐盟／英國使用者）。
import { AdsConsent } from 'react-native-google-mobile-ads';

/** 對應 AdsConsentPrivacyOptionsRequirementStatus；用字串比對，避免測試環境載入原生 enum。 */
export function shouldShowPrivacyOptions(status: string | null | undefined): boolean {
  return status === 'REQUIRED';
}

/** 讀取目前是否需要顯示入口；尚未知道時先向 UMP 更新一次資訊。任何錯誤（離線等）都視為不需要。 */
export async function loadPrivacyOptionsRequired(): Promise<boolean> {
  try {
    let info = await AdsConsent.getConsentInfo();
    if (info.privacyOptionsRequirementStatus === 'UNKNOWN') {
      info = await AdsConsent.requestInfoUpdate();
    }
    return shouldShowPrivacyOptions(info.privacyOptionsRequirementStatus);
  } catch {
    return false;
  }
}

/** 開啟隱私權選項表單；失敗回傳 false。 */
export async function openPrivacyOptionsForm(): Promise<boolean> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch {
    return false;
  }
}
