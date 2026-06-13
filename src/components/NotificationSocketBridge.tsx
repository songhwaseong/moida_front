import { useEffect, useRef } from 'react';
import React from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import { useToast } from './ToastContext';
import type { NotificationDto } from '../api/notifications';
import {
  setActiveNotificationClient,
  clearActiveNotificationClient,
} from './notificationSocket';
import { getAccessToken } from '../utils/authStorage';
// 외부(App.tsx, axiosInstance) 에서 명시 종료가 필요하면 './notificationSocket' 의
// disconnectNotificationSocket 을 직접 import 한다. 본 파일은 컴포넌트만 export 하도록 분리되어 있다.

interface Props {
  /**
   * 일반 로그인 또는 관리자 로그인 등 어떤 형태든 인증된 세션인지 여부.
   * false 면 구독을 즉시 끊는다.
   */
  isAuthenticated: boolean;

  /**
   * 새 알림이 도착했을 때 호출되는 콜백. App.tsx 의 unread 카운트 갱신과 연결한다.
   * STOMP push 본문(NotificationDto)을 그대로 전달하지만, 호출 측이 별도 처리 없이
   * 단순히 unread 카운트를 다시 가져오게만 해도 충분하다.
   */
  onIncoming?: (notification: NotificationDto) => void;
}

const WS_RECONNECT_DELAY_MS = 3000;

const getWebSocketUrl = (token: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // 핸드셰이크(HTTP 업그레이드) 단계에서 서버가 Principal 을 세팅할 수 있도록 토큰을 쿼리파라미터로 전달한다.
  // (개인 알림 user-destination 이 동작하려면 session.getPrincipal() 이 있어야 하고,
  //  핸드셰이크는 STOMP connectHeaders 를 볼 수 없으므로 URL 로 넘긴다.)
  return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
};

/**
 * 전역 실시간 알림 브릿지.
 *
 * - 로그인 상태일 때 STOMP 클라이언트를 1개 열어 /user/queue/notifications 를 구독한다.
 * - 알림 도착 시 토스트로 즉시 노출 + onIncoming 콜백으로 상위 unread 카운트 갱신을 트리거.
 * - 로그아웃되면 자동으로 연결을 끊는다.
 *
 * 채팅용 WebSocket(ProductLiveChat) 과는 독립된 클라이언트이지만, 같은 /ws 엔드포인트를 사용해
 * 서버 측 STOMP 세션 비용은 동일하다(연결 2개). 필요 시 추후 단일 클라이언트로 통합 가능.
 */
const NotificationSocketBridge: React.FC<Props> = ({ isAuthenticated, onIncoming }) => {
  const { showToast } = useToast();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getAccessToken();
    if (!token) return;

    const client = new Client({
      brokerURL: getWebSocketUrl(token),
      // WebSocketAuthChannelInterceptor 가 CONNECT 프레임의 Authorization 헤더에서 JWT 를 읽는다.
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: WS_RECONNECT_DELAY_MS,
      onConnect: () => {
        // /user/queue/notifications 는 SimpMessagingTemplate.convertAndSendToUser(...) 의 라우팅 결과.
        // STOMP Principal.getName()(=이메일) 기준으로 본인에게만 도달한다.
        client.subscribe('/user/queue/notifications', (frame: IMessage) => {
          try {
            const payload = JSON.parse(frame.body) as NotificationDto;
            // 토스트는 짧은 제목 위주로 노출 (본문이 길 수 있어 카드/배지에는 적합하지만 토스트엔 부담)
            showToast(payload.title, 'info');
            onIncoming?.(payload);
          } catch (parseError) {
            console.error('Failed to parse notification frame', parseError);
          }
        });
      },
      onStompError: frame => {
        console.error('Notification STOMP error', frame.headers.message, frame.body);
      },
      onWebSocketError: event => {
        console.error('Notification WebSocket error', event);
      },
    });

    clientRef.current = client;
    setActiveNotificationClient(client); // 외부 disconnect 진입점에서 참조하도록 모듈 ref 에 등록
    client.activate();

    return () => {
      clientRef.current = null;
      // 모듈 참조도 함께 정리. 동일성 검사로 다른 인스턴스의 client 를 실수로 지우지 않게.
      clearActiveNotificationClient(client);
      void client.deactivate();
    };
    // showToast / onIncoming 은 부모에서 useCallback 으로 안정적으로 내려준다고 가정.
    // 매 렌더 새 함수로 들어오면 매번 재연결되니 주의.
  }, [isAuthenticated, onIncoming, showToast]);

  return null;
};

export default NotificationSocketBridge;
