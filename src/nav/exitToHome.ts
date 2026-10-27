import type { useRouter } from 'expo-router';
import { Alert } from 'react-native';

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

/** 流程左上「結束」：確認後回首頁；這一輪還沒提交的內容不保存。 */
export function confirmExitFlow(router: Router): void {
  Alert.alert('要結束這一輪嗎？', '這一輪還沒完成，進度不會被保存。', [
    { text: '繼續練習', style: 'cancel' },
    { text: '結束', style: 'destructive', onPress: () => exitToHome(router) },
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
