import { AdsConsent } from 'react-native-google-mobile-ads';
import {
  loadPrivacyOptionsRequired,
  openPrivacyOptionsForm,
  shouldShowPrivacyOptions,
} from '../privacyOptions';

const consent = AdsConsent as unknown as Record<string, jest.Mock>;

describe('shouldShowPrivacyOptions', () => {
  it('只有 REQUIRED 才顯示', () => {
    expect(shouldShowPrivacyOptions('REQUIRED')).toBe(true);
    expect(shouldShowPrivacyOptions('NOT_REQUIRED')).toBe(false);
    expect(shouldShowPrivacyOptions('UNKNOWN')).toBe(false);
    expect(shouldShowPrivacyOptions(undefined)).toBe(false);
    expect(shouldShowPrivacyOptions(null)).toBe(false);
  });
});

describe('loadPrivacyOptionsRequired', () => {
  beforeEach(() => {
    consent.getConsentInfo = jest.fn();
    consent.requestInfoUpdate = jest.fn();
  });

  it('已知需要時直接回傳 true，不再更新', async () => {
    consent.getConsentInfo.mockResolvedValue({ privacyOptionsRequirementStatus: 'REQUIRED' });
    expect(await loadPrivacyOptionsRequired()).toBe(true);
    expect(consent.requestInfoUpdate).not.toHaveBeenCalled();
  });

  it('不需要時回傳 false', async () => {
    consent.getConsentInfo.mockResolvedValue({ privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
    expect(await loadPrivacyOptionsRequired()).toBe(false);
  });

  it('未知時先更新資訊再判斷', async () => {
    consent.getConsentInfo.mockResolvedValue({ privacyOptionsRequirementStatus: 'UNKNOWN' });
    consent.requestInfoUpdate.mockResolvedValue({ privacyOptionsRequirementStatus: 'REQUIRED' });
    expect(await loadPrivacyOptionsRequired()).toBe(true);
  });

  it('發生錯誤時視為不需要', async () => {
    consent.getConsentInfo.mockRejectedValue(new Error('offline'));
    expect(await loadPrivacyOptionsRequired()).toBe(false);
  });
});

describe('openPrivacyOptionsForm', () => {
  it('成功回傳 true，失敗回傳 false', async () => {
    consent.showPrivacyOptionsForm = jest.fn().mockResolvedValue({});
    expect(await openPrivacyOptionsForm()).toBe(true);
    consent.showPrivacyOptionsForm = jest.fn().mockRejectedValue(new Error('x'));
    expect(await openPrivacyOptionsForm()).toBe(false);
  });
});
