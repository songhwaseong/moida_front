import type { Client } from '@stomp/stompjs';

/**
 * 알림 STOMP 클라이언트의 모듈 레벨 단일 참조.
 *
 * NotificationSocketBridge (컴포넌트) 가 연결 직후 setActiveNotificationClient() 로 등록하고,
 * 언마운트 시 clearActiveNotificationClient() 로 해제한다.
 * 외부(logout, axios 401 핸들러 등) 에서는 disconnectNotificationSocket() 으로 명시 종료할 수 있다.
 *
 * 왜 컴포넌트 파일과 분리했나:
 *   - React Fast Refresh 는 한 모듈이 컴포넌트와 비-컴포넌트(함수/상수) 를 동시에 export 하면
 *     HMR 보장이 깨진다고 경고한다(react-refresh/only-export-components).
 *   - 모듈 변수가 컴포넌트 파일에 있으면 HMR 시 변수가 재초기화되어 active 참조가 끊길 수 있다.
 *   - 그래서 ref + 외부 진입점만 따로 두고 컴포넌트는 컴포넌트만 export 하도록 분리.
 *
 * 단일 ref 가정:
 *   - 브릿지는 앱 전역에서 최대 1개만 마운트된다(App.tsx 의 최종 단계 1회).
 *   - 두 개 이상 마운트되면 마지막에 등록된 것만 추적된다 — 운영상 문제는 아님.
 */

let activeClient: Client | null = null;

export const setActiveNotificationClient = (client: Client): void => {
  activeClient = client;
};

/**
 * cleanup 에서 호출. 동일성 검사로 다른 인스턴스의 client 를 실수로 지우지 않게 보호.
 */
export const clearActiveNotificationClient = (client: Client): void => {
  if (activeClient === client) activeClient = null;
};

/**
 * 외부에서 호출하는 명시적 종료 진입점. logout/logoutAdmin, 401 핸들러 등에서 사용.
 * - 클라이언트가 없으면 noop.
 * - DISCONNECT 프레임 전송 + reconnect 차단을 위해 deactivate() 호출.
 * - Promise 반환 — 필요 시 호출 측에서 await 가능. 보통은 fire-and-forget 으로 충분.
 */
export const disconnectNotificationSocket = async (): Promise<void> => {
  const client = activeClient;
  if (!client) return;
  activeClient = null;
  try {
    await client.deactivate();
  } catch (error) {
    console.warn('Failed to deactivate notification socket', error);
  }
};
