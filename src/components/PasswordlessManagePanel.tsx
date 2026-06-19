import React, { useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { withdrawPasswordlessByPassword, withdrawPasswordlessByEmail } from '../api/passwordless';
import { sendEmailCode, verifyEmailCode } from '../api/emailVerification';
import styles from './PasswordlessManagePanel.module.css';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

interface LoginResponse {
  accessToken: string;
}

interface PasswordlessStatusResponse {
  registered: boolean;
}

interface PasswordlessRegistrationStartResponse {
  qr: string;
  corpId: string;
  registerKey: string;
  terms: number;
  serverUrl: string;
  userId: string;
  pushConnectorUrl: string;
  pushConnectorToken: string;
  expiresInSeconds: number;
}

type ManageMode = 'register' | 'withdraw';
type WithdrawMethod = 'password' | 'email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
};

const authHeader = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

interface Props {
  onBack?: () => void;
}

const PasswordlessManagePanel: React.FC<Props> = ({ onBack }) => {
  const [mode, setMode] = useState<ManageMode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [registration, setRegistration] = useState<PasswordlessRegistrationStartResponse | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('password');
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      if (timeLeft <= 1) {
        socketRef.current?.close();
        setRegistration(null);
        setTimeLeft(null);
        setError('Passwordless 등록 시간이 만료되었습니다.');
        setStatus('');
      } else {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const loginForPasswordlessManage = async () => {
    if (!email.trim()) throw new Error('이메일을 입력해주세요.');
    if (!EMAIL_PATTERN.test(email)) throw new Error('이메일 형식이 올바르지 않아요.');
    if (!password.trim()) throw new Error('비밀번호를 입력해주세요.');

    const response = await axiosInstance.post<ApiResponse<LoginResponse>>('/auth/login', {
      email: email.trim(),
      password,
    });
    return response.data.data.accessToken;
  };

  const confirmRegistration = async (token = accessToken) => {
    if (!token) return;
    const response = await axiosInstance.post<ApiResponse<PasswordlessStatusResponse>>(
      '/members/me/passwordless/registration/confirm',
      undefined,
      { headers: authHeader(token) }
    );

    if (response.data.data.registered) {
      socketRef.current?.close();
      setRegistration(null);
      setTimeLeft(null);
      setStatus('Passwordless 등록 완료.');
      if (onBack) {
        setTimeout(() => onBack(), 1200);
      }
      return;
    }

    setStatus('아직 등록 대기 중. 앱에서 QR 등록 후 다시 확인.');
  };

  const startRegistration = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    socketRef.current?.close();

    try {
      const token = await loginForPasswordlessManage();
      setAccessToken(token);
      const response = await axiosInstance.post<ApiResponse<PasswordlessRegistrationStartResponse>>(
        '/members/me/passwordless/registration/start',
        undefined,
        { headers: authHeader(token) }
      );
      const nextRegistration = response.data.data;
      setRegistration(nextRegistration);
      setTimeLeft(nextRegistration.expiresInSeconds);
      setStatus('MOIDA 앱에서 QR을 스캔해 등록하세요.');

      if (nextRegistration.pushConnectorUrl && nextRegistration.pushConnectorToken) {
        const socket = new WebSocket(nextRegistration.pushConnectorUrl);
        socketRef.current = socket;
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'hand', pushConnectorToken: nextRegistration.pushConnectorToken }));
        };
        socket.onmessage = () => {
          void confirmRegistration(token);
        };
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, err instanceof Error ? err.message : 'Passwordless 등록을 시작하지 못했어요.'));
    } finally {
      setLoading(false);
    }
  };

  const cancelRegistration = () => {
    socketRef.current?.close();
    setRegistration(null);
    setTimeLeft(null);
    setStatus('');
    setError('');
  };

  // 평상시 해지 — 이메일+비밀번호 확인 (로그인 세션 불필요).
  const withdrawByPassword = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    socketRef.current?.close();

    try {
      if (!email.trim()) throw new Error('이메일을 입력해주세요.');
      if (!EMAIL_PATTERN.test(email)) throw new Error('이메일 형식이 올바르지 않아요.');
      if (!password.trim()) throw new Error('비밀번호를 입력해주세요.');

      await withdrawPasswordlessByPassword(email.trim(), password);
      setAccessToken('');
      setRegistration(null);
      setStatus('Passwordless 등록 해제 완료.');
      if (onBack) {
        setTimeout(() => onBack(), 1200);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, err instanceof Error ? err.message : 'Passwordless 등록 해제 실패.'));
    } finally {
      setLoading(false);
    }
  };

  // 분실 복구 해지 1단계 — 이메일로 인증 코드 발송.
  const sendWithdrawEmailCode = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      if (!email.trim()) throw new Error('이메일을 입력해주세요.');
      if (!EMAIL_PATTERN.test(email)) throw new Error('이메일 형식이 올바르지 않아요.');

      await sendEmailCode(email.trim(), 'PASSWORDLESS_WITHDRAW');
      setCodeSent(true);
      setStatus('인증 코드를 이메일로 보냈어요. 5분 이내에 입력해주세요.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, err instanceof Error ? err.message : '인증 코드 발송에 실패했어요.'));
    } finally {
      setLoading(false);
    }
  };

  // 분실 복구 해지 2단계 — 코드 검증 후 해지.
  const withdrawByEmail = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    socketRef.current?.close();

    try {
      if (!emailCode.trim()) throw new Error('인증 코드를 입력해주세요.');

      await verifyEmailCode(email.trim(), emailCode.trim(), 'PASSWORDLESS_WITHDRAW');
      await withdrawPasswordlessByEmail(email.trim());
      setAccessToken('');
      setRegistration(null);
      setCodeSent(false);
      setEmailCode('');
      setStatus('Passwordless 등록 해제 완료.');
      if (onBack) {
        setTimeout(() => onBack(), 1200);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, err instanceof Error ? err.message : 'Passwordless 등록 해제 실패.'));
    } finally {
      setLoading(false);
    }
  };

  const qrSrc = registration?.qr
    ? registration.qr.startsWith('data:') || registration.qr.startsWith('http://') || registration.qr.startsWith('https://')
      ? registration.qr
      : `data:image/png;base64,${registration.qr}`
    : '';

  if (registration) {
    return (
      <section className={styles.panel} aria-label="Passwordless 등록">
        <div className={styles.qrRegistrationView}>
          <h3 className={styles.qrTitle}>Passwordless 서비스 등록</h3>
          <p className={styles.qrDesc}>스마트폰에 MOIDA 앱을 설치한 후, QR 코드를 스캔해 주세요.</p>
          
          <div className={styles.qrBox}>
            <img src={qrSrc} alt="Passwordless 등록 QR" />
            <dl>
              <div>
                <dt>서버 URL</dt>
                <dd>{registration.serverUrl || '-'}</dd>
              </div>
              <div>
                <dt>등록 키</dt>
                <dd>{registration.registerKey || '-'}</dd>
              </div>
            </dl>
          </div>

          {timeLeft !== null && (
            <div className={styles.timerRow}>
              <span className={styles.timerText}>
                남은 시간: {Math.floor(timeLeft / 60)} : {String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {status && <p className={styles.status}>{status}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={() => void confirmRegistration()} disabled={loading} className={styles.confirmBtn}>
              등록 확인
            </button>
            <button type="button" onClick={cancelRegistration} className={styles.cancelBtn}>
              취소
            </button>
          </div>

          {onBack && (
            <div className={styles.returnRow}>
              <button
                type="button"
                className={styles.returnLink}
                onClick={() => {
                  cancelRegistration();
                  onBack();
                }}
              >
                로그인으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label="Passwordless 등록 및 해지">
      <div className={styles.header}>
        <div>
          <strong>Passwordless 관리</strong>
          <p>이메일/비밀번호 확인 후 QR 등록 또는 해지.</p>
        </div>
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'register' ? styles.active : ''}
            onClick={() => { setMode('register'); setError(''); setStatus(''); }}
          >
            QR 등록
          </button>
          <button
            type="button"
            className={mode === 'withdraw' ? styles.active : ''}
            onClick={() => { setMode('withdraw'); setError(''); setStatus(''); setCodeSent(false); setEmailCode(''); }}
          >
            해지
          </button>
        </div>
      </div>

      {mode === 'register' ? (
        <>
          <div className={styles.fields}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일" autoComplete="email" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              type="password"
              autoComplete="current-password"
            />
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => void startRegistration()} disabled={loading}>
              QR 등록 시작
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.subTabs}>
            <button
              type="button"
              className={withdrawMethod === 'password' ? styles.active : ''}
              onClick={() => { setWithdrawMethod('password'); setError(''); setStatus(''); }}
            >
              비밀번호
            </button>
            <button
              type="button"
              className={withdrawMethod === 'email' ? styles.active : ''}
              onClick={() => { setWithdrawMethod('email'); setError(''); setStatus(''); setCodeSent(false); setEmailCode(''); }}
            >
              이메일 인증
            </button>
          </div>

          <div className={styles.withdrawBody}>
            {withdrawMethod === 'password' ? (
              <>
                <div className={styles.fields}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일" autoComplete="email" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => void withdrawByPassword()} disabled={loading}>
                    Passwordless 해지
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.qrDesc}>휴대폰/앱 분실 시, 가입한 이메일로 인증 후 해지할 수 있어요.</p>
                <div className={styles.fields}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일" autoComplete="email" />
                  {codeSent && (
                    <input
                      value={emailCode}
                      onChange={(event) => setEmailCode(event.target.value)}
                      placeholder="인증 코드 6자리"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  )}
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => void sendWithdrawEmailCode()} disabled={loading}>
                    {codeSent ? '인증 코드 재전송' : '인증 코드 받기'}
                  </button>
                  {codeSent && (
                    <button type="button" onClick={() => void withdrawByEmail()} disabled={loading}>
                      Passwordless 해지
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {status && <p className={styles.status}>{status}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {onBack && (
        <div className={styles.returnRow}>
          <button type="button" className={styles.returnLink} onClick={onBack}>
            로그인으로 돌아가기
          </button>
        </div>
      )}
    </section>
  );
};

export default PasswordlessManagePanel;
