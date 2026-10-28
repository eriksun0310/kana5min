import type { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useSessionStore } from '../store/sessionStore';

type Router = ReturnType<typeof useRouter>;

/**
 * 離開全螢幕流程回到首頁。
 * 流程畫面都在根 Stack 上（步驟之間用 replace），所以 dismissAll 會直接回到分頁；
 * 若目前沒有可以 dismiss 的畫面（例如從深連結進來），改用 replace('/')。
 */
export function exitToHome(router: Router): void {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

/**
 * 流程左上「✕」：確認後回首頁。做到哪會存起來（SRS 不動），首頁按「繼續今天的練習」可以接續；
 * 時間暫停，隔天的存檔作廢。
 */
export function confirmExitFlow(router: Router): void {
  Alert.alert('要先離開嗎？', '做到哪會幫你存起來，之後可以從首頁繼續。', [
    { text: '繼續練習', style: 'cancel' },
    {
      text: '先離開',
      onPress: () => {
        useSessionStore.getState().leave(Date.now());
        exitToHome(router);
      },
    },
  ]);
}

/**
 * 回到「今天」分頁（首頁）。
 * 畢業畫面與導流頁可能從首頁（自動帶入）或設定頁（再次進入）開啟；
 * exitToHome 只會把堆疊收回分頁，停在原本的分頁，所以這裡再切到首頁分頁。
 */
export function goHomeTab(router: Router): void {
  exitToHome(router);
  router.navigate('/');
}
