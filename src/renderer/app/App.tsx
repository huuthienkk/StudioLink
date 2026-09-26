import React, { useState, useEffect } from 'react';
import '../styles/tokens.css';
import { Icons, LicenseActivationModal } from '../components';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { CampaignsPage } from '../features/campaigns/CampaignsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { PlatformType } from '../../shared/types';

export const App: React.FC = () => {
  const [platform, setPlatform] = useState<PlatformType>('linkedin');
  const [activeMenu, setActiveMenu] = useState<'accounts' | 'campaigns' | 'reports' | 'settings'>('accounts');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasElectronBackend, setHasElectronBackend] = useState(false);

  // License State
  const [licenseInfo, setLicenseInfo] = useState<{
    deviceId: string;
    tier: string;
    expiresAt?: string;
    isValid: boolean;
    licenseKey?: string;
    customerName?: string;
    errorMessage?: string;
    isActivated?: boolean;
  }>({
    deviceId: 'Đang nhận diện HWID...',
    tier: 'standard',
    expiresAt: 'Đang kiểm tra...',
    isValid: true,
  });
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // Auto Updater State
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    version?: string;
    message?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
  }>({ state: 'idle' });
  const [isUpdateBannerDismissed, setIsUpdateBannerDismissed] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    let unsubUpdate: (() => void) | undefined;

    const initTarget = async () => {
      if ((window as any).electronAPI) {
        setHasElectronBackend(true);
        if ((window as any).electronAPI.getAppTarget) {
          try {
            const target = await (window as any).electronAPI.getAppTarget();
            if (target === 'linkedin') {
              setPlatform('linkedin');
            }
          } catch {}
        }

        // Lấy thông tin bản quyền và kiểm tra hợp lệ
        if ((window as any).electronAPI.getLicenseInfo) {
          try {
            const info = await (window as any).electronAPI.getLicenseInfo();
            if (info) {
              setLicenseInfo(info);
              if (!info.isValid) {
                setIsLicenseModalOpen(true);
              }
            }
          } catch (e) {
            console.error('Lỗi khi tải thông tin bản quyền:', e);
          }
        }

        // Lấy thông tin phiên bản và auto-updater
        if ((window as any).electronAPI.getAppVersion) {
          try {
            const ver = await (window as any).electronAPI.getAppVersion();
            if (ver) setAppVersion(ver);
          } catch {}
        }
        if ((window as any).electronAPI.getUpdateStatus) {
          try {
            const status = await (window as any).electronAPI.getUpdateStatus();
            if (status) setUpdateStatus(status);
          } catch {}
        }
        if ((window as any).electronAPI.onUpdateStatus) {
          unsubUpdate = (window as any).electronAPI.onUpdateStatus((status: any) => {
            setUpdateStatus(status);
            if (status.state === 'downloaded') {
              setIsUpdateBannerDismissed(false);
            }
          });
        }
      }
    };
    initTarget();

    return () => {
      unsubUpdate?.();
    };
  }, []);

  const handleLicenseActivated = (newInfo: any) => {
    setLicenseInfo(newInfo);
    setIsLicenseModalOpen(false);
  };

  const handleDeactivateDevice = async () => {
    if (
      !confirm(
        'Bạn có chắc muốn HỦY LIÊN KẾT trên máy tính này không?\nMã bản quyền sẽ được giải phóng để bạn kích hoạt sang máy tính mới.'
      )
    ) {
      return;
    }

    if ((window as any).electronAPI?.deactivateLicense) {
      try {
        const res = await (window as any).electronAPI.deactivateLicense();
        alert(res?.message || 'Đã hủy liên kết máy thành công.');
        const check = await (window as any).electronAPI.getLicenseInfo();
        if (check) setLicenseInfo(check);
        setIsLicenseModalOpen(true);
      } catch (e: any) {
        alert('Lỗi: ' + e.message);
      }
    }
  };

  const handleCheckForUpdates = async () => {
    if (!(window as any).electronAPI?.checkForUpdates) return;
    setIsCheckingUpdate(true);
    try {
      const res = await (window as any).electronAPI.checkForUpdates();
      if (res) setUpdateStatus(res);
    } catch (e: any) {
      setUpdateStatus({ state: 'error', message: e.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleRestartAndInstall = () => {
    if ((window as any).electronAPI?.restartAndInstall) {
      (window as any).electronAPI.restartAndInstall();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar Trái */}
      <aside
        style={{
          position: 'relative',
          width: isSidebarCollapsed ? 76 : 250,
          backgroundColor: 'var(--sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 14px',
          borderRight: '1px solid var(--sidebar-border)',
          transition: 'width 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        {/* Nút Toggle Floating */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{
            position: 'absolute',
            right: -13,
            top: 25,
            width: 26,
            height: 26,
            borderRadius: '50%',
            backgroundColor: '#2e0a11',
            border: '1.5px solid #6b1825',
            color: '#f0e6e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            transition: 'background-color 0.2s, transform 0.2s, color 0.2s',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-red)';
            e.currentTarget.style.borderColor = 'var(--primary-red)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.transform = 'scale(1.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2e0a11';
            e.currentTarget.style.borderColor = '#6b1825';
            e.currentTarget.style.color = '#f0e6e7';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {isSidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
        </button>

        <div>
          {/* Brand Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              height: 36,
              overflow: 'hidden',
            }}
          >
            {/* Logo N */}
            <div
              style={{
                width: 36,
                height: 36,
                backgroundColor: 'var(--primary-red)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 18,
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title="NexaLink"
            >
              N
            </div>

            {/* Brand Text */}
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.2px',
                whiteSpace: 'nowrap',
                opacity: isSidebarCollapsed ? 0 : 1,
                transform: isSidebarCollapsed ? 'translateX(-10px)' : 'translateX(0)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
              }}
            >
              NexaLink
            </span>
          </div>

          {/* Huy Hiệu Phiên Bản Chuyên Biệt LinkedIn */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              marginBottom: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(10, 102, 194, 0.18)',
              border: '1px solid rgba(10, 102, 194, 0.4)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            title="Phiên bản chuyên biệt LinkedIn Recruitment & Connecting"
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.LinkedIn />
            </div>
            <div
              style={{
                opacity: isSidebarCollapsed ? 0 : 1,
                transform: isSidebarCollapsed ? 'translateX(-8px)' : 'translateX(0)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                LinkedIn Edition
              </div>
              <div style={{ fontSize: 10.5, color: '#93c5fd' }}>
                B2B Talent Recruiter
              </div>
            </div>
          </div>

          {/* Menu Tính Năng Chính */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Tài khoản */}
            <button
              onClick={() => setActiveMenu('accounts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeMenu === 'accounts' ? 600 : 500,
                backgroundColor: activeMenu === 'accounts' ? 'var(--sidebar-active)' : 'transparent',
                color: activeMenu === 'accounts' ? '#ffffff' : '#e0d2d4',
                transition: 'background-color 0.18s, color 0.18s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
              title="Tài khoản"
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icons.User />
              </div>
              <span
                style={{
                  opacity: isSidebarCollapsed ? 0 : 1,
                  transform: isSidebarCollapsed ? 'translateX(-8px)' : 'translateX(0)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
                }}
              >
                Tài khoản
              </span>
            </button>

            {/* Chiến dịch */}
            <button
              onClick={() => setActiveMenu('campaigns')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeMenu === 'campaigns' ? 600 : 500,
                backgroundColor: activeMenu === 'campaigns' ? 'var(--sidebar-active)' : 'transparent',
                color: activeMenu === 'campaigns' ? '#ffffff' : '#e0d2d4',
                transition: 'background-color 0.18s, color 0.18s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
              title="Chiến dịch"
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icons.Megaphone />
              </div>
              <span
                style={{
                  opacity: isSidebarCollapsed ? 0 : 1,
                  transform: isSidebarCollapsed ? 'translateX(-8px)' : 'translateX(0)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
                }}
              >
                Chiến dịch
              </span>
            </button>

            {/* Báo cáo */}
            <button
              onClick={() => setActiveMenu('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '11px 14px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeMenu === 'reports' ? 600 : 500,
                backgroundColor: activeMenu === 'reports' ? 'var(--sidebar-active)' : 'transparent',
                color: activeMenu === 'reports' ? '#ffffff' : '#e0d2d4',
                transition: 'background-color 0.18s, color 0.18s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
              title="Báo cáo"
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icons.BarChart />
              </div>
              <span
                style={{
                  opacity: isSidebarCollapsed ? 0 : 1,
                  transform: isSidebarCollapsed ? 'translateX(-8px)' : 'translateX(0)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
                }}
              >
                Báo cáo
              </span>
            </button>
          </nav>
        </div>

        {/* Cài đặt (Đáy Sidebar) */}
        <div>
          <button
            onClick={() => setActiveMenu('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '11px 14px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              backgroundColor: activeMenu === 'settings' ? 'var(--sidebar-active)' : 'transparent',
              color: '#d4c2c5',
              width: '100%',
              transition: 'background-color 0.18s, color 0.18s',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            title="Cài đặt"
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Settings />
            </div>
            <span
              style={{
                opacity: isSidebarCollapsed ? 0 : 1,
                transform: isSidebarCollapsed ? 'translateX(-8px)' : 'translateX(0)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
              }}
            >
              Cài đặt
            </span>
          </button>
        </div>
      </aside>

      {/* Vùng Nội Dung Chính Bên Phải */}
      <main
        style={{
          flex: 1,
          padding: '28px 40px',
          overflowY: 'auto',
          backgroundColor: 'var(--app-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Thanh trạng thái kết nối Backend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          {hasElectronBackend ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                color: 'var(--status-active)',
              }}
              title="Đã kết nối với CSDL SQLite và Main Process của Electron"
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--status-active)' }}></span>
              Backend Desktop: Đã kết nối SQLite
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(230, 57, 70, 0.12)',
                border: '1px solid rgba(230, 57, 70, 0.3)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                color: '#fca5a5',
              }}
              title="Đang xem trước trên trình duyệt web. Dữ liệu lưu trong LocalStorage."
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fca5a5' }}></span>
              Chế độ xem trước Web (LocalStorage)
            </div>
          )}
        </div>

        {/* Nội dung trang */}
        <div style={{ flex: 1 }}>
          {activeMenu === 'accounts' && <AccountsPage platform={platform} />}
          {activeMenu === 'campaigns' && <CampaignsPage platform={platform} />}
          {activeMenu === 'reports' && <ReportsPage platform={platform} />}
          {activeMenu === 'settings' && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>Cài đặt Hệ thống</h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                Quản lý bản quyền thiết bị, thông tin kết nối và cấu hình bảo mật ứng dụng.
              </p>

              {/* Thẻ Quản Lý Bản Quyền Thiết Bị */}
              <div className="table-container" style={{ padding: 24, marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
                    <span>🛡️</span> Thông tin Bản quyền Thiết bị (License Hub)
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setIsLicenseModalOpen(true)}
                      style={{ fontSize: 12, padding: '5px 12px' }}
                    >
                      🔑 Đổi Mã Key Khác
                    </button>
                    {licenseInfo.licenseKey && (
                      <button
                        onClick={handleDeactivateDevice}
                        style={{
                          fontSize: 12,
                          padding: '5px 12px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                        title="Hủy liên kết máy tính này để chuyển sang kích hoạt trên máy mới"
                      >
                        🔄 Hủy liên kết (Đổi máy)
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: 12,
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  <div style={{ background: '#110508', padding: '10px 14px', borderRadius: 8, border: '1px solid #380e16' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Mã Phần Cứng (Hardware ID)</span>
                    <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{licenseInfo.deviceId}</strong>
                  </div>

                  <div style={{ background: '#110508', padding: '10px 14px', borderRadius: 8, border: '1px solid #380e16' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Mã Bản Quyền Đang Dùng</span>
                    <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>
                      {licenseInfo.licenseKey
                        ? `${licenseInfo.licenseKey.substring(0, 7)}****${licenseInfo.licenseKey.slice(-4)}`
                        : 'Chưa gắn mã key'}
                    </strong>
                  </div>

                  <div style={{ background: '#110508', padding: '10px 14px', borderRadius: 8, border: '1px solid #380e16' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Khách hàng sở hữu</span>
                    <strong style={{ color: '#ffffff' }}>{licenseInfo.customerName || 'Người dùng bản quyền'}</strong>
                  </div>

                  <div style={{ background: '#110508', padding: '10px 14px', borderRadius: 8, border: '1px solid #380e16' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Trạng thái & Hạn dùng</span>
                    <strong style={{ color: licenseInfo.isValid ? 'var(--status-active)' : '#ef4444' }}>
                      {licenseInfo.isValid ? `Hợp lệ | ${licenseInfo.tier.toUpperCase()}` : 'Chưa kích hoạt / Hết hạn'}
                    </strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Hết hạn: {licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thẻ Cập nhật Phiên bản Tự động */}
              <div className="table-container" style={{ padding: 24, marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
                      <span>🚀</span> Cập nhật Phiên bản Ứng dụng
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                      Phiên bản hiện tại: <strong style={{ color: '#ffffff' }}>v{appVersion}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      className="btn-secondary"
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdate || updateStatus.state === 'downloading'}
                      style={{ fontSize: 13, padding: '7px 14px' }}
                    >
                      {isCheckingUpdate || updateStatus.state === 'checking'
                        ? '🔄 Đang kiểm tra...'
                        : '🔄 Kiểm tra cập nhật'}
                    </button>

                    {updateStatus.state === 'downloaded' && (
                      <button
                        className="btn-primary"
                        onClick={handleRestartAndInstall}
                        style={{
                          fontSize: 13,
                          padding: '7px 16px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        ⚡ Khởi động lại & Cập nhật ngay
                      </button>
                    )}
                  </div>
                </div>

                {/* Hộp trạng thái cập nhật */}
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    borderRadius: 8,
                    background:
                      updateStatus.state === 'downloaded'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : updateStatus.state === 'error'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : updateStatus.state === 'downloading'
                        ? 'rgba(14, 165, 233, 0.12)'
                        : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${
                      updateStatus.state === 'downloaded'
                        ? 'rgba(16, 185, 129, 0.35)'
                        : updateStatus.state === 'error'
                        ? 'rgba(239, 68, 68, 0.35)'
                        : updateStatus.state === 'downloading'
                        ? 'rgba(14, 165, 233, 0.35)'
                        : 'var(--border-color)'
                    }`,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>
                      {updateStatus.state === 'downloaded'
                        ? '🎉'
                        : updateStatus.state === 'downloading'
                        ? '⏳'
                        : updateStatus.state === 'available'
                        ? '✨'
                        : updateStatus.state === 'error'
                        ? '⚠️'
                        : 'ℹ️'}
                    </span>
                    <span style={{ color: '#ffffff', fontWeight: 500 }}>
                      {updateStatus.message || 'Hệ thống tự động kiểm tra và tải bản mới ngầm trong nền.'}
                    </span>
                  </div>

                  {/* Thanh tiến trình khi đang tải */}
                  {updateStatus.state === 'downloading' && updateStatus.progress && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Tiến độ tải: {updateStatus.progress.percent}%</span>
                        <span>{((updateStatus.progress.bytesPerSecond || 0) / 1024).toFixed(0)} KB/s</span>
                      </div>
                      <div style={{ height: 6, background: '#1c0a0e', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${updateStatus.progress.percent}%`,
                            background: 'linear-gradient(90deg, #38bdf8, #34d399)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  💡 <em>Cơ chế cập nhật: Khi có bản mới được phát hành, NexaLink sẽ tự động tải ngầm về máy. Bạn chỉ việc nhấn nút 'Khởi động lại ngay' hoặc bản cập nhật sẽ tự động áp dụng trong lần mở app tiếp theo.</em>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Banner Thông báo Bản Cập Nhật Đã Tải Xong */}
        {updateStatus.state === 'downloaded' && !isUpdateBannerDismissed && (
          <div
            style={{
              position: 'fixed',
              top: 18,
              right: 28,
              zIndex: 9999,
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
              border: '1.5px solid #10b981',
              borderRadius: 12,
              padding: '12px 18px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              maxWidth: 480,
            }}
          >
            <span style={{ fontSize: 24 }}>🎉</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#ffffff' }}>
                Đã tải xong bản cập nhật mới {updateStatus.version ? `v${updateStatus.version}` : ''}!
              </div>
              <div style={{ fontSize: 12, color: '#a7f3d0', marginTop: 2 }}>
                Bấm khởi động lại để hoàn tất nâng cấp ngay lập tức.
              </div>
            </div>
            <button
              onClick={handleRestartAndInstall}
              style={{
                backgroundColor: '#ffffff',
                color: '#065f46',
                border: 'none',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              ⚡ Khởi động lại
            </button>
            <button
              onClick={() => setIsUpdateBannerDismissed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6ee7b7',
                fontSize: 16,
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
              }}
              title="Để sau (Sẽ tự động cập nhật khi bạn tắt ứng dụng)"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Kích Hoạt Bản Quyền */}
        <LicenseActivationModal
          isOpen={isLicenseModalOpen}
          deviceId={licenseInfo.deviceId}
          errorMessage={licenseInfo.errorMessage}
          onSuccess={handleLicenseActivated}
          onClose={licenseInfo.isValid ? () => setIsLicenseModalOpen(false) : undefined}
        />
      </main>
    </div>
  );
};
