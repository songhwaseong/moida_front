import React, { useEffect, useState } from 'react';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationCategory,
  type NotificationDto,
} from '../api/notifications';
import styles from './NotificationPage.module.css';

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: string; color: string }> = {
  BID: { label: '입찰', icon: 'B', color: '#FDEEED' },
  PRICE: { label: '가격', icon: 'P', color: '#EAF3DE' },
  CHAT: { label: '채팅', icon: 'C', color: '#E1F5EE' },
  TRADE: { label: '거래', icon: 'T', color: '#EEF2FF' },
  MARKETING: { label: '혜택', icon: 'M', color: '#FFF3E0' },
  SYSTEM: { label: '안내', icon: 'S', color: '#F0F1F4' },
};

interface Props {
  onUnreadCountChange?: () => void;
}

const NotificationPage: React.FC<Props> = ({ onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    let ignore = false;

    // 알림 탭은 서버에 저장된 기존 알림을 그대로 보여줍니다.
    const loadNotifications = async () => {
      try {
        const data = await getNotifications();
        if (!ignore) {
          setNotifications(data);
          setError('');
        }
      } catch (loadError) {
        console.error('Failed to load notifications', loadError);
        if (!ignore) {
          setNotifications([]);
          setError('알림을 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadNotifications();

    return () => { ignore = true; };
  }, []);

  const markOne = async (notificationId: number) => {
    // 개별 읽음 처리는 optimistic update 후 실패하면 원래 상태로 복구합니다.
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.read) return;

    setNotifications((prev) => prev.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )));

    try {
      const updated = await markNotificationAsRead(notificationId);
      setNotifications((prev) => prev.map((notification) => (
        notification.id === notificationId ? updated : notification
      )));
      onUnreadCountChange?.();
    } catch (markError) {
      console.error('Failed to mark notification as read', markError);
      setNotifications((prev) => prev.map((notification) => (
        notification.id === notificationId ? target : notification
      )));
      setError('읽음 처리에 실패했습니다.');
    }
  };

  const markAll = async () => {
    // 전체 읽음도 먼저 화면을 갱신하고 서버 실패 시 이전 목록으로 되돌립니다.
    const previous = notifications;
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    setError('');

    try {
      await markAllNotificationsAsRead();
      onUnreadCountChange?.();
    } catch (markError) {
      console.error('Failed to mark all notifications as read', markError);
      setNotifications(previous);
      setError('모두 읽음 처리에 실패했습니다.');
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>알림 {unreadCount > 0 ? <span className={styles.badge}>{unreadCount}</span> : null}</h1>
        {unreadCount > 0 ? (
          <button className={styles.markAll} onClick={markAll} type="button">모두 읽음</button>
        ) : null}
      </div>

      {loading ? <p className={styles.stateText}>알림을 불러오는 중입니다.</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
      {!loading && !error && notifications.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>도착한 알림이 없습니다.</p>
          <p className={styles.emptyDesc}>새 소식이 생기면 이곳에 모아둘게요.</p>
        </div>
      ) : null}

      <div className={styles.list}>
        {notifications.map((notification) => {
          const meta = CATEGORY_META[notification.category] ?? CATEGORY_META.SYSTEM;

          return (
            <button
              key={notification.id}
              className={`${styles.item} ${!notification.read ? styles.unread : ''}`}
              onClick={() => markOne(notification.id)}
              type="button"
            >
              <div className={styles.iconBox} style={{ background: meta.color }} aria-hidden="true">
                <span>{meta.icon}</span>
              </div>
              <div className={styles.content}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{notification.title}</span>
                  <span className={styles.time}>{notification.createdAt ?? ''}</span>
                </div>
                <p className={styles.body}>{notification.content}</p>
                <span className={styles.categoryLabel}>{meta.label}</span>
              </div>
              {!notification.read ? <div className={styles.dot} /> : null}
            </button>
          );
        })}
      </div>
    </main>
  );
};

export default NotificationPage;
