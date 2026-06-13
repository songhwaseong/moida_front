import type { NotificationDto } from '../api/notifications';

/**
 * 실시간 알림 이벤트 버스.
 *
 * NotificationSocketBridge 가 받은 STOMP 푸시(NotificationDto)는 App.tsx 의
 * handleIncomingNotification 으로 전달되어 종 배지 카운트를 갱신한다.
 * 같은 푸시를 알림 화면(NotificationPage)에도 실시간으로 반영하기 위해,
 * App.tsx 에서 emitIncomingNotification 으로 흘려보내고
 * NotificationPage 가 subscribeToIncomingNotifications 로 구독해 목록에 즉시 추가한다.
 *
 * 왜 이 모듈을 따로 두나:
 *   - NotificationPage 는 lazy + 조건부 렌더링이라 항상 마운트돼 있지 않다.
 *     App state 로 단일 "최신 알림" 을 내려주면 화면이 닫혀 있는 동안 도착한
 *     푸시 처리나 중복 제거가 까다롭다. 구독 시점에만 받는 가벼운 이벤트 버스가 단순하다.
 *   - 브릿지/페이지를 직접 결합하지 않아 App.tsx 의 기존 배선(onIncoming)을 그대로 둘 수 있다.
 */

type Listener = (notification: NotificationDto) => void;

const listeners = new Set<Listener>();

/**
 * 새 알림 도착 이벤트를 구독한다. 반환된 함수를 호출하면 구독이 해제된다.
 * (NotificationPage 가 마운트 시 등록, 언마운트 시 해제하도록 useEffect cleanup 에 사용)
 */
export const subscribeToIncomingNotifications = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * 도착한 알림을 모든 구독자에게 전달한다. 구독자가 없으면(화면이 닫혀 있으면) noop.
 * 한 리스너에서 예외가 나도 나머지 전달은 계속한다.
 */
export const emitIncomingNotification = (notification: NotificationDto): void => {
  listeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (error) {
      console.error('notification listener failed', error);
    }
  });
};
