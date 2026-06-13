import React, { useCallback, useEffect, useState } from 'react';
import styles from './MyWalletPage.module.css';
import { useToast } from '../../components/ToastContext';
import {
  deleteBankAccount,
  depositWallet,
  getWallet,
  saveBankAccount,
  withdrawWallet,
  type BankAccountDto,
  type WalletDto,
  type WalletTransactionDto,
} from '../../api/wallet';

interface Props { onBack: () => void; }

const BANKS = [
  '국민은행', '신한은행', '우리은행', 'KEB하나은행', '농협은행',
  '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '씨티은행',
  '부산은행', '대구은행', '경남은행', '광주은행', '전북은행',
];

const VIRTUAL_DEPOSIT_ACCOUNT = {
  bank: '신한은행',
  accountNumber: '110-982-476315',
  holder: '모이다페이',
};

interface AccountInfo {
  bank: string;
  accountNumber: string;
  holder: string;
  verified: boolean;
}

interface Transaction {
  id: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  description: string;
  date: string;
  status: '완료' | '대기' | '취소';
}

type TabType = '잔액/충전' | '계좌 관리' | '거래 내역';

/**
 * API에서 받아온 계좌 정보를 컴포넌트 내부 State 규격에 맞게 변환합니다.
 */
const toAccountInfo = (item: BankAccountDto): AccountInfo => ({
  bank: item.bank,
  accountNumber: item.accountNumber,
  holder: item.holder,
  verified: item.verified,
});

/**
 * 날짜 문자열을 YYYY.MM.DD 포맷으로 변환합니다.
 */
const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * API에서 받아온 거래 내역 DTO를 컴포넌트 내부 Transaction 규격에 맞게 변환합니다.
 */
const toTransaction = (item: WalletTransactionDto): Transaction => ({
  id: item.id,
  type: item.type === 'DEPOSIT' ? 'deposit' : 'withdraw',
  amount: item.amount,
  description: item.description,
  date: formatDate(item.createdAt),
  status: item.status === 'COMPLETED' ? '완료' : item.status === 'PENDING' ? '대기' : '취소',
});

const MyWalletPage: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('잔액/충전');
  const [balance, setBalance] = useState(0);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // 충전
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMode, setDepositMode] = useState(false);

  // 출금
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMode, setWithdrawMode] = useState(false);

  // 계좌 등록
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newBank, setNewBank] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { showToast } = useToast();
  const QUICK_AMOUNTS = [10000, 30000, 50000, 100000];

  /**
   * API를 통해 조회한 지갑 데이터(잔액, 계좌 정보, 거래 내역)를 화면의 각 State에 일괄 반영합니다.
   */
  const applyWallet = useCallback((wallet: WalletDto) => {
    setBalance(wallet.balance);
    setAccount(wallet.account ? toAccountInfo(wallet.account) : null);
    setTransactions(wallet.transactions.map(toTransaction));
  }, []);

  /**
   * 백엔드 API로부터 회원의 지갑 및 거래 내역 정보를 조회하여 화면에 로드합니다.
   */
  const loadWallet = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);
    try {
      const wallet = await getWallet();
      applyWallet(wallet);
    } catch (error) {
      console.error(error);
      setPageError('계좌 정보를 불러오지 못했습니다.');
    } finally {
      setPageLoading(false);
    }
  }, [applyWallet]);

  // 컴포넌트 마운트 시 지갑 데이터를 비동기로 로드합니다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWallet();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWallet]);

  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };

  /**
   * 입금(충전) 요청을 처리하는 핸들러입니다.
   * 백엔드에 입금 거래(PENDING 상태) 생성을 요청합니다.
   */
  const handleDeposit = async () => {
    const amount = parseInt(depositAmount.replace(/,/g, ''), 10);
    if (!amount || amount < 1000) { showToast('최소 1,000원 이상 충전 가능해요', 'warning'); return; }
    const previousBalance = balance;
    setDepositLoading(true);
    try {
      const wallet = await depositWallet(amount);
      applyWallet(wallet);
      // 충전 완료 시 잔액 변경은 실제 입금 처리 후에 이루어지므로, 화면에서는 이전 잔액으로 유지합니다.
      setBalance(previousBalance);
      setDepositAmount('');
      showToast(`${amount.toLocaleString()} 입금 요청 완료!\n송금 확인 후 잔액에 반영됩니다.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('충전에 실패했습니다.', 'error');
    } finally {
      setDepositLoading(false);
    }
  };

  /**
   * 출금 신청을 처리하는 핸들러입니다.
   * 백엔드에 출금 거래(PENDING 상태) 생성을 요청합니다.
   */
  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount.replace(/,/g, ''), 10);
    if (!amount || amount < 1000) { showToast('최소 1,000원 이상 출금 가능해요', 'warning'); return; }
    if (amount > balance) { showToast('잔액이 부족해요', 'error'); return; }
    if (!account) { showToast('출금 계좌를 먼저 등록해주세요', 'warning'); setActiveTab('계좌 관리'); return; }
    setWithdrawLoading(true);
    try {
      const wallet = await withdrawWallet(amount);
      applyWallet(wallet);
      setWithdrawAmount('');
      showToast(`${amount.toLocaleString()} 출금 신청 완료!\n출금 처리 완료 후 잔액에서 차감됩니다.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('출금 신청에 실패했습니다.', 'error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  /**
   * 계좌 등록 및 변경 시 계좌 인증 및 저장을 처리하는 핸들러입니다.
   */
  const handleVerifyAccount = async () => {
    const e: Record<string, string> = {};
    if (!newBank) e.bank = '은행을 선택해주세요';
    if (!newAccountNumber.trim()) e.accountNumber = '계좌번호를 입력해주세요';
    else if (!/^\d{10,14}$/.test(newAccountNumber.replace(/-/g, ''))) e.accountNumber = '올바른 계좌번호를 입력해주세요';
    if (!newHolder.trim()) e.holder = '예금주명을 입력해주세요';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setVerifyLoading(true);
    try {
      const request = { bank: newBank, accountNumber: newAccountNumber, holder: newHolder };
      const wallet = await saveBankAccount(request);
      applyWallet(wallet);
      setNewBank('');
      setNewAccountNumber('');
      setNewHolder('');
      setShowAccountForm(false);
      showToast('계좌 인증이 완료됐어요!', 'success');
    } catch (error) {
      console.error(error);
      showToast('계좌 인증에 실패했습니다.', 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  /**
   * 등록된 출금 계좌를 삭제하는 핸들러입니다.
   */
  const handleDeleteAccount = async () => {
    try {
      const wallet = await deleteBankAccount();
      applyWallet(wallet);
      setShowAccountForm(false);
      showToast('계좌가 삭제됐어요', 'success');
    } catch (error) {
      console.error(error);
      showToast('계좌 삭제에 실패했습니다.', 'error');
    }
  };

  /**
   * 계좌 수정/등록 폼을 열기 전, 기존에 등록된 계좌가 있다면 해당 정보로 폼을 초기화합니다.
   */
  const openAccountForm = () => {
    setNewBank(account?.bank ?? '');
    setNewAccountNumber(account?.accountNumber ?? '');
    setNewHolder(account?.holder ?? '');
    setErrors({});
    setShowAccountForm(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>내 계좌 / 잔액</span>
        <div style={{ width: 32 }}/>
      </div>

      {/* 잔액 카드 */}
      <div className={styles.balanceCard}>
        <p className={styles.balanceLabel}>사용 가능 잔액</p>
        <p className={styles.balanceAmount}> {balance.toLocaleString()}</p>
        <div className={styles.balanceBtns}>
          <button
            className={`${styles.balanceBtn} ${depositMode ? styles.balanceBtnDepositActive : styles.balanceBtnOutline}`}
            onClick={() => { setDepositMode(p => !p); setWithdrawMode(false); setActiveTab('잔액/충전'); }}
          >충전하기</button>
          <button
            className={`${styles.balanceBtn} ${withdrawMode ? styles.balanceBtnWithdraw : styles.balanceBtnOutline}`}
            onClick={() => { setWithdrawMode(p => !p); setDepositMode(false); setActiveTab('계좌 관리'); }}
          >출금하기</button>
        </div>
      </div>

      {/* 탭 */}
      <div className={styles.tabs}>
        {(['잔액/충전', '계좌 관리', '거래 내역'] as TabType[]).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >{t}</button>
        ))}
      </div>

      <div className={styles.content}>
        {pageLoading && (
          <div className={styles.section}>
            <p className={styles.sectionDesc}>계좌 정보를 불러오는 중입니다...</p>
          </div>
        )}

        {!pageLoading && pageError && (
          <div className={styles.section}>
            <p className={styles.sectionDesc}>{pageError}</p>
            <button className={styles.actionBtn} onClick={() => void loadWallet()}>다시 시도</button>
          </div>
        )}

        {/* ── 잔액/충전 탭 ── */}
        {!pageLoading && !pageError && activeTab === '잔액/충전' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>충전 금액</p>
            <div className={styles.quickAmounts}>
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  className={styles.quickBtn}
                  onClick={() => setDepositAmount(a.toLocaleString())}
                >{(a / 10000).toFixed(0)}만원</button>
              ))}
            </div>
            <div className={styles.inputRow}>
              <span className={styles.inputPrefix}></span>
              <input
                className={styles.input}
                placeholder="직접 입력"
                value={depositAmount}
                onChange={e => setDepositAmount(formatPrice(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div className={styles.infoBox}>
              <p className={styles.infoText}>입금 방법</p>
              <p className={styles.infoDesc}>입금 요청 후 가상계좌로 입금하면, 확인이 완료된 뒤 잔액에 반영됩니다.</p>
              <div className={styles.virtualAccount}>
                <div className={styles.vaRow}>
                  <span className={styles.vaLabel}>은행</span>
                  <span className={styles.vaValue}>{VIRTUAL_DEPOSIT_ACCOUNT.bank}</span>
                </div>
                <div className={styles.vaRow}>
                  <span className={styles.vaLabel}>입금계좌</span>
                  <span className={styles.vaValue}>{VIRTUAL_DEPOSIT_ACCOUNT.accountNumber}</span>
                </div>
                <div className={styles.vaRow}>
                  <span className={styles.vaLabel}>예금주</span>
                  <span className={styles.vaValue}>{VIRTUAL_DEPOSIT_ACCOUNT.holder}</span>
                </div>
              </div>
            </div>
            <button
              className={`${styles.actionBtn} ${depositLoading ? styles.loading : ''}`}
              onClick={handleDeposit}
              disabled={depositLoading || !depositAmount}
            >
              {depositLoading ? '처리 중...' : '입금 요청하기'}
            </button>
          </div>
        )}

        {/* ── 계좌 관리 탭 ── */}
        {!pageLoading && !pageError && activeTab === '계좌 관리' && (
          <div className={styles.section}>
            {account && !showAccountForm ? (
              <>
                <p className={styles.sectionTitle}>등록된 계좌</p>
                <div className={styles.accountCard}>
                  <div className={styles.accountHeader}>
                    <span className={styles.accountBank}>🏦 {account.bank}</span>
                    <span className={styles.verifiedBadge}>✓ 인증완료</span>
                  </div>
                  <p className={styles.accountNumber}>{account.accountNumber}</p>
                  <p className={styles.accountHolder}>예금주: {account.holder}</p>
                  <div className={styles.accountBtns}>
                    <button className={styles.accountChangeBtn} onClick={openAccountForm}>계좌 변경</button>
                    <button className={styles.accountDeleteBtn} onClick={handleDeleteAccount}>삭제</button>
                  </div>
                </div>

                <p className={styles.sectionTitle} style={{ marginTop: 24 }}>출금 신청</p>
                <div className={styles.inputRow}>
                  <span className={styles.inputPrefix}></span>
                  <input
                    className={styles.input}
                    placeholder="출금할 금액 입력"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(formatPrice(e.target.value))}
                    inputMode="numeric"
                  />
                </div>
                <p className={styles.balanceHint}>출금 가능 잔액: {balance.toLocaleString()}</p>
                <div className={styles.infoBox}>
                  <p className={styles.infoText}>출금 안내</p>
                  <p className={styles.infoDesc}>출금 신청은 요청 상태로 접수되며, 출금 처리 완료 후 잔액에서 차감됩니다.</p>
                </div>
                <button
                  className={`${styles.actionBtn} ${withdrawLoading ? styles.loading : ''}`}
                  onClick={handleWithdraw}
                  disabled={withdrawLoading || !withdrawAmount}
                >
                  {withdrawLoading ? '처리 중...' : '출금 신청'}
                </button>
              </>
            ) : (
              <>
                <p className={styles.sectionTitle}>{account ? '계좌 변경' : '계좌 등록'}</p>
                <p className={styles.sectionDesc}>판매 수익금 출금을 위해 계좌를 등록해주세요</p>

                {/* 은행 선택 */}
                <div className={styles.inputGroup}>
                  <label className={styles.label}>은행 선택 *</label>
                  <select
                    className={`${styles.select} ${errors.bank ? styles.inputError : ''}`}
                    value={newBank}
                    onChange={e => { setNewBank(e.target.value); setErrors(p => ({ ...p, bank: '' })); }}
                  >
                    <option value="">은행을 선택해주세요</option>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {errors.bank && <p className={styles.fieldError}>{errors.bank}</p>}
                </div>

                {/* 계좌번호 */}
                <div className={styles.inputGroup}>
                  <label className={styles.label}>계좌번호 *</label>
                  <input
                    className={`${styles.inputFull} ${errors.accountNumber ? styles.inputError : ''}`}
                    placeholder="- 없이 숫자만 입력"
                    value={newAccountNumber}
                    onChange={e => { setNewAccountNumber(e.target.value.replace(/[^0-9]/g, '')); setErrors(p => ({ ...p, accountNumber: '' })); }}
                    inputMode="numeric"
                    maxLength={14}
                  />
                  {errors.accountNumber && <p className={styles.fieldError}>{errors.accountNumber}</p>}
                </div>

                {/* 예금주 */}
                <div className={styles.inputGroup}>
                  <label className={styles.label}>예금주명 *</label>
                  <input
                    className={`${styles.inputFull} ${errors.holder ? styles.inputError : ''}`}
                    placeholder="예금주명을 입력해주세요"
                    value={newHolder}
                    onChange={e => { setNewHolder(e.target.value); setErrors(p => ({ ...p, holder: '' })); }}
                  />
                  {errors.holder && <p className={styles.fieldError}>{errors.holder}</p>}
                </div>

                <div className={styles.formBtns}>
                  {account && (
                    <button className={styles.cancelBtn} onClick={() => setShowAccountForm(false)}>취소</button>
                  )}
                  <button
                    className={`${styles.actionBtn} ${verifyLoading ? styles.loading : ''}`}
                    onClick={handleVerifyAccount}
                    disabled={verifyLoading}
                  >
                    {verifyLoading ? '인증 중...' : '계좌 인증하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 거래 내역 탭 ── */}
        {!pageLoading && !pageError && activeTab === '거래 내역' && (
          <div>
            {transactions.length === 0 ? (
              <div className={styles.section}>
                <p className={styles.sectionDesc}>아직 거래 내역이 없습니다.</p>
              </div>
            ) : transactions.map(tx => (
              <div key={tx.id} className={styles.txItem}>
                <div className={`${styles.txIcon} ${tx.type === 'deposit' ? styles.txDeposit : styles.txWithdraw}`}>
                  {tx.type === 'deposit' ? '↓' : '↑'}
                </div>
                <div className={styles.txBody}>
                  <p className={styles.txDesc}>{tx.description}</p>
                  <p className={styles.txDate}>{tx.date}</p>
                </div>
                <div className={styles.txRight}>
                  <p className={`${styles.txAmount} ${tx.type === 'deposit' ? styles.txAmountPos : styles.txAmountNeg}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </p>
                  <p className={styles.txStatus}>{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyWalletPage;
