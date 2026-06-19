import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import {
  createProductChatMessage,
  getProductChatMessages,
  type ProductChatMessage,
  type ProductChatRoomStatus,
} from '../api/chat';
import styles from './ProductLiveChat.module.css';
import { getAccessToken } from '../utils/authStorage';
import { issueWebSocketTicket } from '../api/webSocketTicket';

interface Props {
  productId: number;
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
  title?: string;
}

const WS_RECONNECT_DELAY_MS = 3000;
const SEND_COOLDOWN_MS = 2000;

const getWebSocketUrl = (ticket: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws?ticket=${encodeURIComponent(ticket)}`;
};

// 서버가 모든 구독자에게 같은 메시지를 보내므로, 현재 사용자의 JWT subject와
// 보낸 사람 ID를 비교해서 내 메시지 여부를 프론트에서 표시한다.
const getCurrentMemberId = () => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(window.atob(token.split('.')[1] ?? '')) as { sub?: string };
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
};

const ProductLiveChat: React.FC<Props> = ({
  productId,
  isLoggedIn,
  onRequireLogin,
  title = '실시간 채팅',
}) => {
  const [messages, setMessages] = useState<ProductChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [roomStatus, setRoomStatus] = useState<ProductChatRoomStatus>('ACTIVE');
  const lastSentAtRef = useRef(0);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  const isReadOnly = roomStatus !== 'ACTIVE';

  const normalizeMine = useCallback((message: ProductChatMessage): ProductChatMessage => {
    const currentMemberId = getCurrentMemberId();
    return {
      ...message,
      mine: currentMemberId != null && message.senderId === currentMemberId,
    };
  }, []);

  const appendMessage = useCallback((message: ProductChatMessage) => {
    const normalized = normalizeMine(message);
    setMessages(prev => [...prev.filter(item => item.id !== normalized.id), normalized]);
  }, [normalizeMine]);

  // 최초 진입 때는 REST로 방 상태와 최근 메시지를 가져오고,
  // 이후 새 메시지는 STOMP 구독으로 실시간 수신한다.
  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getProductChatMessages(productId);
      setRoomStatus(data.roomStatus);
      setMessages(data.messages.map(normalizeMine));
      setError('');
    } catch (loadError) {
      console.error('Failed to load product chat messages', loadError);
      if (!silent) setError('채팅을 불러오지 못했습니다.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [normalizeMine, productId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadMessages();
    }, 0);

    return () => window.clearTimeout(initialTimer);
  }, [loadMessages]);

  useEffect(() => {
    if (!isLoggedIn || !getAccessToken()) return;
    const client = new Client({
      reconnectDelay: WS_RECONNECT_DELAY_MS,
      beforeConnect: async () => {
        client.brokerURL = getWebSocketUrl(await issueWebSocketTicket());
      },
      onConnect: () => {
        // 상품 상세마다 하나의 공개 채팅 토픽을 사용하고,
        // 해당 상품을 보고 있는 사용자들이 같은 토픽을 구독한다.
        client.subscribe(`/topic/products/${productId}/chat`, (frame: IMessage) => {
          try {
            const message = JSON.parse(frame.body) as ProductChatMessage;
            appendMessage(message);
            setRoomStatus(message.roomStatus);
            setError('');
          } catch (parseError) {
            console.error('Failed to parse product chat message', parseError);
          }
        });
      },
      onStompError: frame => {
        console.error('Product chat STOMP error', frame.headers.message, frame.body);
        setError('실시간 채팅 연결에 문제가 생겼습니다.');
      },
      onWebSocketError: event => {
        console.error('Product chat WebSocket error', event);
      },
    });

    stompClientRef.current = client;
    client.activate();

    return () => {
      stompClientRef.current = null;
      void client.deactivate();
    };
  }, [appendMessage, isLoggedIn, productId]);

  useEffect(() => {
    // 메시지 영역 내부 스크롤만 아래로 이동시켜,
    // 입력창에서 Enter를 눌러도 상세 페이지 전체가 움직이지 않게 한다.
    const messagesEl = messagesRef.current;
    if (!messagesEl) return;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, [messages.length]);

  const sendMessage = async () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    if (isReadOnly || isSending) return;

    const content = input.trim();
    if (!content) return;

    // 프론트 쿨다운은 사용자에게 즉시 안내하기 위한 장치이고,
    // 백엔드에서도 같은 제한을 걸어 직접 호출 우회를 막는다.
    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_COOLDOWN_MS) {
      setError('메시지는 2초에 한 번씩 보낼 수 있습니다.');
      return;
    }

    setIsSending(true);
    try {
      const stompClient = stompClientRef.current;
      lastSentAtRef.current = Date.now();

      if (stompClient?.connected) {
        const token = getAccessToken();
        // STOMP 프레임은 axios 인터셉터를 거치지 않으므로,
        // 전송 프레임에도 JWT를 직접 실어 백엔드 인증에 사용한다.
        stompClient.publish({
          destination: `/app/products/${productId}/chat`,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: JSON.stringify({ content }),
        });
      } else {
        // 소켓이 재연결 중이면 기존 REST 전송 API로 대체한다.
        // 저장된 메시지는 백엔드에서 동일한 토픽으로 다시 브로드캐스트된다.
        const created = await createProductChatMessage(productId, content);
        appendMessage(created);
      }

      setInput('');
      setError('');
    } catch (sendError) {
      console.error('Failed to send product chat message', sendError);
      setError('메시지 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const helperText = !isLoggedIn
    ? '로그인 후 대화에 참여할 수 있습니다.'
    : isReadOnly
      ? '관리자 설정으로 현재 읽기 전용입니다.'
      : '상품을 보고 있는 사람들과 대화해보세요.';

  return (
    <section className={styles.chatBox}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{title}</p>
          <p className={styles.helper}>{helperText}</p>
        </div>
        <span className={styles.count}>최근 {messages.length}</span>
      </div>

      <div className={styles.messages} ref={messagesRef}>
        {isLoading ? (
          <p className={styles.empty}>채팅을 불러오는 중입니다.</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>아직 대화가 없습니다. 첫 메시지를 남겨보세요.</p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`${styles.messageRow} ${message.mine ? styles.mineRow : ''}`}
            >
              <div className={`${styles.bubble} ${message.mine ? styles.mineBubble : ''} ${message.deleted ? styles.deletedBubble : ''}`}>
                <div className={styles.meta}>
                  <span className={styles.sender}>
                    {message.mine ? '나' : message.senderName}
                    {message.seller && <span className={styles.sellerBadge}>판매자</span>}
                  </span>
                  <span className={styles.time}>{message.createdAt}</span>
                </div>
                <p className={styles.content}>{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={input}
          maxLength={500}
          placeholder={isLoggedIn ? '메시지를 입력하세요.' : '로그인이 필요합니다.'}
          disabled={!isLoggedIn || isReadOnly || isSending}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button
          className={styles.sendButton}
          onClick={() => void sendMessage()}
          disabled={!input.trim() || !isLoggedIn || isReadOnly || isSending}
          aria-label="메시지 보내기"
        >
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
            <path d="M22 2 11 13" />
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default ProductLiveChat;
