import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from './admin.module.css';
import {
  getAdminCategories,
  setCategoryVisibility,
  reorderCategories,
  type AdminCategoryDto,
} from '../../api/adminCategories';

// 화면에서 쓰는 형태. DB DTO 와 거의 동일하되 order 라는 짧은 이름을 쓴다.
interface CategoryRow {
  id: number;
  name: string;
  emoji: string | null;
  order: number;
  visible: boolean;
}

const SvgIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}/>
);

// 카테고리 이름 → 표시 아이콘. DB 에 emoji 가 있으면 그것을 우선 사용하고, 없으면 미리 정의된 SVG 로 대체.
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '디지털/가전': <SvgIcon><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></SvgIcon>,
  '패션/의류':   <SvgIcon><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></SvgIcon>,
  '명품':        <SvgIcon><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></SvgIcon>,
  '시계/주얼리': <SvgIcon><circle cx="12" cy="12" r="7"/><path d="M12 9v3l1.5 1.5"/><path d="M9 2h6M9 22h6"/></SvgIcon>,
  '신발':        <SvgIcon><path d="M3 11l5-5 4 4 4-5 5 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-5z"/></SvgIcon>,
  '스포츠/레저': <SvgIcon><circle cx="12" cy="12" r="9"/><path d="M12 3c-1.5 3-1.5 6 0 9s1.5 6 0 9"/><path d="M3 12c3-1.5 6-1.5 9 0s6 1.5 9 0"/></SvgIcon>,
  '뷰티/미용':   <SvgIcon><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></SvgIcon>,
  '게임/취미':   <SvgIcon><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="17" cy="13" r="1" fill="currentColor"/><path d="M3 7h18l-1.5 9.5a2 2 0 01-2 1.5H6.5a2 2 0 01-2-1.5L3 7z"/></SvgIcon>,
  '음향/악기':   <SvgIcon><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></SvgIcon>,
  '한정판':      <SvgIcon><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></SvgIcon>,
  '이월상품':    <SvgIcon><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></SvgIcon>,
};

const renderIcon = (c: CategoryRow): React.ReactNode => {
  if (c.emoji && c.emoji.trim()) return <span style={{ fontSize: 18 }}>{c.emoji}</span>;
  return CATEGORY_ICONS[c.name] ?? <span style={{ fontSize: 18 }}>📦</span>;
};

const toRow = (dto: AdminCategoryDto): CategoryRow => ({
  id: dto.id,
  name: dto.name,
  emoji: dto.emoji,
  order: dto.displayOrder,
  visible: dto.visible,
});

const BannerPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragIdRef = useRef<number | null>(null);

  // 목록 로드
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await getAdminCategories();
      setCategories(list.map(toRow));
    } catch {
      setLoadError('카테고리 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 페치, 정상 데이터 로딩 패턴
  useEffect(() => { reload(); }, [reload]);

  const handleDragStart = (id: number) => { dragIdRef.current = id; };

  const handleDrop = async (targetId: number) => {
    const fromId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOverId(null);
    if (fromId == null || fromId === targetId) return;

    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(c => c.id === fromId);
    const toIdx = sorted.findIndex(c => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const next = reordered.map((c, i) => ({ ...c, order: i + 1 }));

    // 낙관적 업데이트 + 실패 시 롤백
    const snapshot = categories;
    setCategories(next);
    try {
      const updated = await reorderCategories(
        next.map(c => ({ id: c.id, displayOrder: c.order })),
      );
      setCategories(updated.map(toRow));
    } catch {
      setCategories(snapshot);
      setAlertMsg('카테고리 순서 변경에 실패했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  const toggleCategoryVisible = async (id: number) => {
    const target = categories.find(c => c.id === id);
    if (!target) return;
    const next = !target.visible;

    // 낙관적 업데이트
    const snapshot = categories;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, visible: next } : c));
    try {
      const updated = await setCategoryVisibility(id, next);
      setCategories(prev => prev.map(c => c.id === id ? toRow(updated) : c));
    } catch {
      setCategories(snapshot);
      setAlertMsg('노출 변경에 실패했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.title}>카테고리 관리</div>
        <div className={s.subtitle}>카테고리 노출 순서와 표시 여부를 관리합니다.</div>
      </div>

      <div style={{ maxWidth: 1040 }}>
        {loading ? (
          <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
            카테고리를 불러오는 중입니다…
          </div>
        ) : loadError ? (
          <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
            {loadError}
            <div style={{ marginTop: 12 }}>
              <button onClick={reload} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>다시 시도</button>
            </div>
          </div>
        ) : sortedCategories.length === 0 ? (
          <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
            등록된 카테고리가 없습니다.
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr><th>순서</th><th>아이콘</th><th>카테고리명</th><th>노출</th><th>순서 변경</th></tr>
            </thead>
            <tbody>
              {sortedCategories.map(c => (
                <tr
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(c.id)}
                  onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => handleDrop(c.id)}
                  style={{
                    background: dragOverId === c.id ? '#EEF4FF' : undefined,
                    borderTop: dragOverId === c.id ? '2px solid #1565C0' : undefined,
                    cursor: 'grab',
                  }}
                >
                  <td style={{ color: '#8B8FA8', fontWeight: 600 }}>{c.order}</td>
                  <td style={{ color: '#4A4A6A' }}>{renderIcon(c)}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={c.visible} onChange={() => toggleCategoryVisible(c.id)} />
                      <span style={{ fontSize: 12, color: c.visible ? '#2E7D32' : '#8B8FA8' }}>{c.visible ? '노출중' : '숨김'}</span>
                    </label>
                  </td>
                  <td style={{ color: '#B0B4C8', fontSize: 16 }}>⠿</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 안내 모달 */}
      {alertMsg && (
        <div
          onClick={() => setAlertMsg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: 24, borderRadius: 12, minWidth: 320, textAlign: 'center', fontFamily: 'Noto Sans KR, sans-serif' }}
          >
            <div style={{ fontSize: 14, color: '#1A1A2E', lineHeight: 1.6, margin: '8px 0 20px', whiteSpace: 'pre-line' }}>
              {alertMsg}
            </div>
            <button
              onClick={() => setAlertMsg(null)}
              style={{ padding: '8px 24px', border: 'none', borderRadius: 8, background: '#E24B4A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
            >확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerPage;
