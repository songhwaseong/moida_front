import React from 'react';
import styles from './SectionHeader.module.css';

// 홈/리스트 화면의 섹션 상단 헤더.
// 레이아웃: [타이틀 + rightSlot] ────── [더보기 →]
//   - title      : 섹션 이름 (예: '🔴 실시간 경매')
//   - rightSlot  : 타이틀 옆에 표시할 보조 컨트롤 (예: 가격 정렬 칩) — 선택
//   - onMoreClick: '더보기' 클릭 시 호출되는 핸들러
interface SectionHeaderProps {
  title: string;
  onMoreClick?: () => void;
  rightSlot?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onMoreClick, rightSlot }) => {
  return (
    <div className={styles.header}>
      {/* 타이틀과 보조 슬롯은 한 묶음으로 좌측 정렬. 둘 사이 간격은 .leftGroup 의 gap 값이 결정한다. */}
      <div className={styles.leftGroup}>
        <h2 className={styles.title}>{title}</h2>
        {rightSlot && <div className={styles.extra}>{rightSlot}</div>}
      </div>
      <button className={styles.more} onClick={onMoreClick}>더보기 →</button>
    </div>
  );
};

export default SectionHeader;
