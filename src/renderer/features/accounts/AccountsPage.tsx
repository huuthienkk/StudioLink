import React, { useState, useEffect } from 'react';
import { Icons, Modal, FormInput } from '../../components';
import { Account, PlatformType } from '../../../shared/types';

interface AccountsPageProps {
  platform: PlatformType;
}

const STORAGE_KEY_PREFIX = 'nexa_accounts_';

export const AccountsPage: React.FC<AccountsPageProps> = ({ platform }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Thêm tài khoản
  const [username, setUsername] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyStatusMsg, setProxyStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isTestingProxy, setIsTestingProxy] = useState(false);

  // State Quản lý Phiên đăng nhập đang mở
  const [loggingInAccount, setLoggingInAccount] = useState<Account | null>(null);
  const [isFinishingLogin, setIsFinishingLogin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load danh sách tài khoản
  const loadAccounts = async () => {
    try {
      if ((window as any).electronAPI) {
        const all = await (window as any).electronAPI.getAccounts();
        setAccounts(all.filter((a: Account) => a.platform === platform));
      } else {
        const storageKey = `${STORAGE_KEY_PREFIX}${platform}`;
        const saved = localStorage.getItem(storageKey);

        if (saved !== null) {
          try {
            setAccounts(JSON.parse(saved));
            return;
          } catch {}
        }

        const defaultMockAccounts: Account[] = [
          {
            id: 'mock_li_1',
            platform: 'linkedin',
            username: 'Recruiter Pro HN',
            profileDir: '',
            proxyUrl: '103.15.22.8:8080',
            status: 'active',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock_li_2',
            platform: 'linkedin',
            username: 'Talent Acquisition HCM',
            profileDir: '',
            proxyUrl: undefined,
            status: 'idle',
            createdAt: new Date().toISOString(),
          },
        ];

        setAccounts(defaultMockAccounts);
        localStorage.setItem(storageKey, JSON.stringify(defaultMockAccounts));
      }
    } catch (err) {
      console.error('Lỗi khi tải tài khoản:', err);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [platform]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTestProxy = async () => {
    if (!proxyUrl.trim()) {
      setProxyStatusMsg({ text: 'Vui lòng nhập địa chỉ Proxy trước khi kiểm tra.', isError: true });
      return;
    }
    setIsTestingProxy(true);
    setProxyStatusMsg(null);

    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.testProxy(proxyUrl.trim());
        if (res.success) {
          setProxyStatusMsg({
            text: `Proxy sống tốt! Độ trễ: ${res.responseTimeMs}ms ${res.isDuplicate ? '(Cảnh báo: Trùng IP)' : ''}`,
            isError: false,
          });
        } else {
          setProxyStatusMsg({ text: `Proxy lỗi: ${res.errorMessage}`, isError: true });
        }
      } else {
        await new Promise((r) => setTimeout(r, 600));
        setProxyStatusMsg({ text: 'Proxy test OK (Độ trễ: 120ms - Xem trước)', isError: false });
      }
    } catch (e: any) {
      setProxyStatusMsg({ text: e.message || 'Lỗi kiểm tra proxy', isError: true });
    } finally {
      setIsTestingProxy(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const newAcc: Account = {
      id: `acc_${Date.now()}`,
      platform,
      username: username.trim(),
      profileDir: `userData/profiles/profile_${Date.now()}`,
      proxyUrl: proxyUrl.trim() || undefined,
      status: 'idle',
      createdAt: new Date().toISOString(),
    };

    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.createAccount({
          platform,
          username: username.trim(),
          proxyUrl: proxyUrl.trim() || undefined,
        });
        await loadAccounts();
      } else {
        const storageKey = `${STORAGE_KEY_PREFIX}${platform}`;
        const updated = [newAcc, ...accounts];
        setAccounts(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }

      setIsModalOpen(false);
      setUsername('');
      setProxyUrl('');
      setProxyStatusMsg(null);
      showToast(`Đã thêm tài khoản "${newAcc.username}". Hãy bấm "Đăng nhập" để lưu phiên.`);
    } catch (err: any) {
      alert(`Lỗi khi tạo tài khoản: ${err.message}`);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa tài khoản "${name}" không?`)) {
      try {
        if ((window as any).electronAPI) {
          await (window as any).electronAPI.deleteAccount(id);
          await loadAccounts();
        } else {
          const storageKey = `${STORAGE_KEY_PREFIX}${platform}`;
          const updated = accounts.filter((a) => a.id !== id);
          setAccounts(updated);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        showToast(`Đã xóa tài khoản "${name}".`);
      } catch (err: any) {
        alert(`Lỗi khi xóa: ${err.message}`);
      }
    }
  };

  // 1. Mở trình duyệt độc lập để người dùng tự đăng nhập & 2FA
  const handleStartLogin = async (acc: Account) => {
    setLoggingInAccount(acc);
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.startAccountLogin(acc.id);
      } else {
        // Mockup chế độ web preview
        console.log('Mở trình duyệt đăng nhập cho:', acc.username);
      }
    } catch (err: any) {
      alert(`Không thể mở trình duyệt: ${err.message}`);
      setLoggingInAccount(null);
    }
  };

  // 2. Bấm "Tôi đã đăng nhập xong" -> TỰ ĐỘNG ĐÓNG TRÌNH DUYỆT & LƯU PHIÊN
  const handleConfirmLogin = async () => {
    if (!loggingInAccount) return;
    setIsFinishingLogin(true);

    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.finishAccountLogin(loggingInAccount.id);
        await loadAccounts();
      } else {
        // Giả lập lưu phiên trong web preview
        const storageKey = `${STORAGE_KEY_PREFIX}${platform}`;
        const updated = accounts.map((a) =>
          a.id === loggingInAccount.id ? { ...a, status: 'active' as const } : a
        );
        setAccounts(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }

      const accName = loggingInAccount.username;
      setLoggingInAccount(null);
      showToast(`✅ Đã lưu phiên cho "${accName}" và tự động đóng trình duyệt thành công!`);
    } catch (err: any) {
      alert(`Lỗi khi hoàn tất đăng nhập: ${err.message}`);
    } finally {
      setIsFinishingLogin(false);
    }
  };

  // Hủy phiên đăng nhập và đóng trình duyệt
  const handleCancelLogin = async () => {
    if (loggingInAccount) {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.cancelAccountLogin(loggingInAccount.id).catch(() => {});
      }
      setLoggingInAccount(null);
    }
  };

  const platformTitle = platform === 'facebook' ? 'Facebook' : 'LinkedIn';

  return (
    <div>
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            backgroundColor: '#1f1215',
            border: '1px solid var(--status-active)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
            Tài khoản {platformTitle}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Mỗi tài khoản có một Profile độc lập. Người dùng tự đăng nhập và vượt 2FA an toàn, sau đó hệ thống tự động lưu phiên.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Icons.Plus />
          Thêm tài khoản
        </button>
      </div>

      {/* Bảng danh sách tài khoản theo chuẩn Profile */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Tên tài khoản / Nick</th>
              <th style={{ width: '24%' }}>Phiên đăng nhập (Profile)</th>
              <th style={{ width: '20%' }}>Proxy</th>
              <th style={{ width: '18%' }}>Trạng thái</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Chưa có tài khoản {platformTitle} nào. Bấm nút "+ Thêm tài khoản" ở góc trên để bắt đầu.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => {
                const isLoggedIn = acc.status === 'active';

                return (
                  <tr key={acc.id}>
                    {/* Tên tài khoản */}
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {acc.username}
                    </td>

                    {/* Cột Phiên Đăng Nhập */}
                    <td>
                      {isLoggedIn ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(52, 211, 153, 0.12)',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                              color: 'var(--status-active)',
                              padding: '4px 10px',
                              borderRadius: 14,
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            🟢 Đã lưu phiên
                          </span>
                          <button
                            className="action-btn"
                            onClick={() => handleStartLogin(acc)}
                            title="Mở lại Profile trình duyệt để xem hoặc cập nhật cookie"
                          >
                            <Icons.Globe />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartLogin(acc)}
                          style={{
                            backgroundColor: 'var(--primary-red)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 16,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Icons.Globe />
                          Mở web đăng nhập
                        </button>
                      )}
                    </td>

                    {/* Proxy */}
                    <td style={{ color: acc.proxyUrl ? '#f0e6e7' : 'var(--text-muted)' }}>
                      {acc.proxyUrl || 'Không dùng'}
                    </td>

                    {/* Trạng thái */}
                    <td>
                      {isLoggedIn ? (
                        <div className="status-badge">
                          <span className="status-dot active"></span>
                          <span style={{ color: 'var(--status-active)' }}>Đang hoạt động</span>
                        </div>
                      ) : (
                        <div>
                          <div className="status-badge">
                            <span className="status-dot inactive"></span>
                            <span style={{ color: 'var(--status-inactive)' }}>Chưa đăng nhập</span>
                          </div>
                          <span className="status-subtext">Cần đăng nhập để lưu phiên</span>
                        </div>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteAccount(acc.id, acc.username)}
                          title="Xóa tài khoản"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm tài khoản (Không cần mật khẩu) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Thêm tài khoản ${platformTitle}`}>
        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              Tên tài khoản / Tên gợi nhớ
            </label>
            <FormInput
              type="text"
              placeholder="VD: Nick Tuyển Dụng HN hoặc nguyen.minh@gmail.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
              * Bạn không cần nhập mật khẩu tại đây. Sau khi tạo, hãy bấm "Mở web đăng nhập" để tự đăng nhập và vượt 2FA an toàn 100%.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Proxy riêng (Tùy chọn)
              </label>
              <button
                type="button"
                onClick={handleTestProxy}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', fontSize: 12.5 }}
                disabled={isTestingProxy}
              >
                {isTestingProxy ? 'Đang kiểm tra...' : '⚡ Kiểm tra Proxy'}
              </button>
            </div>
            <FormInput
              type="text"
              placeholder="VD: 103.15.22.8:8080 hoặc user:pass@ip:port"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
            />
            {proxyStatusMsg && (
              <p style={{ fontSize: 12, marginTop: 6, color: proxyStatusMsg.isError ? 'var(--status-error)' : 'var(--status-active)' }}>
                {proxyStatusMsg.text}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Tạo tài khoản & Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hướng dẫn Đăng nhập và TỰ ĐỘNG ĐÓNG TRÌNH DUYỆT */}
      <Modal
        isOpen={!!loggingInAccount}
        onClose={handleCancelLogin}
        title={`Đang đăng nhập: ${loggingInAccount?.username || ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: 'rgba(230, 57, 70, 0.12)',
              border: '1px solid rgba(230, 57, 70, 0.3)',
              borderRadius: 8,
              padding: 14,
            }}
          >
            <p style={{ fontSize: 13.5, color: '#ffffff', fontWeight: 600, marginBottom: 8 }}>
              👉 Cửa sổ trình duyệt Chrome riêng đã được mở lên:
            </p>
            <ol style={{ paddingLeft: 18, fontSize: 13, color: '#f0e6e7', lineHeight: 1.6 }}>
              <li>Đăng nhập tài khoản của bạn trên cửa sổ Chrome đó.</li>
              <li>Nhập mã xác thực <strong>2FA / OTP</strong> hoặc xác nhận điện thoại nếu có.</li>
              <li>Sau khi đã vào được Bảng tin (Feed) thành công, hãy bấm nút <strong>"Tôi đã đăng nhập xong"</strong> bên dưới.</li>
            </ol>
            <p style={{ fontSize: 12, color: 'var(--status-active)', marginTop: 8 }}>
              ⭐ Hệ thống sẽ <strong>tự động đóng trình duyệt</strong> và lưu vĩnh viễn phiên đăng nhập để dùng cho các chiến dịch tự động sau này!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelLogin}
              disabled={isFinishingLogin}
            >
              Hủy bỏ / Đóng lại
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirmLogin}
              disabled={isFinishingLogin}
              style={{ backgroundColor: '#10b981' }}
            >
              {isFinishingLogin ? 'Đang lưu & Đóng trình duyệt...' : '✅ Tôi đã đăng nhập xong'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
