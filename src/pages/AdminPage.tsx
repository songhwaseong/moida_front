import React, { useState } from 'react';
import ReportListPage from './admin/ReportListPage';
import SanctionPage from './admin/SanctionPage';
import SuspiciousPage from './admin/SuspiciousPage';
import ChatLogPage from './admin/ChatLogPage';
import MemberListPage from './admin/MemberListPage';
import WithdrawnMemberPage from './admin/WithdrawnMemberPage';
import styles from './AdminPage.module.css';

/* Admin Page  */

type AdminMenu =
  | 'report' | 'suspicious' | 'chatlog' | 'sanction'
  | 'memberList' | 'withdrawn';

interface Props { onLogout: () => void; }

const SECTIONS = [
  {
    title: '신고 / 제재',
    menus: [
      { id: 'report' as AdminMenu, label: '신고 접수', icon: '🚨', badge: 4 },
      { id: 'suspicious' as AdminMenu, label: '사기 감지', icon: '🔍', badge: 2 },
      { id: 'chatlog' as AdminMenu, label: '채팅 로그', icon: '💬' },
      { id: 'sanction' as AdminMenu, label: '제재 내역', icon: '🔒' },
    ],
  },
  {
    title: '회원 관리',
    menus: [
      { id: 'memberList' as AdminMenu, label: '회원 목록', icon: '👥' },
      { id: 'withdrawn' as AdminMenu, label: '탈퇴 회원', icon: '🗑️' },
    ],
  },
];

const AdminPage: React.FC<Props> = ({ onLogout }) => {
  const [menu, setMenu] = useState<AdminMenu>('report');

  const renderContent = () => {
    switch (menu) {
      case 'report': return <ReportListPage />;
      case 'sanction': return <SanctionPage />;
      case 'suspicious': return <SuspiciousPage />;
      case 'chatlog': return <ChatLogPage />;
      case 'memberList': return <MemberListPage />;
      case 'withdrawn': return <WithdrawnMemberPage />;
    }
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sideTop}>
          <div className={styles.logo}>MOIDA</div>
          <div className={styles.adminBadge}>관리자</div>
        </div>
        <nav className={styles.nav}>
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className={styles.navSection}>{section.title}</p>
              {section.menus.map(m => (
                <button
                  key={m.id}
                  className={`${styles.navItem} ${menu === m.id ? styles.navActive : ''}`}
                  onClick={() => setMenu(m.id)}
                >
                  <span className={styles.navIcon}>{m.icon}</span>
                  <span className={styles.navLabel}>{m.label}</span>
                  {m.badge && <span className={styles.navBadge}>{m.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={onLogout}>로그아웃</button>
      </aside>
      <main className={styles.main}>{renderContent()}</main>
    </div>
  );
};

export default AdminPage;
