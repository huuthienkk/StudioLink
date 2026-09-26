import React, { useState } from 'react';

export interface LicenseActivationModalProps {
  isOpen: boolean;
  deviceId: string;
  errorMessage?: string;
  onSuccess: (licenseData: any) => void;
  onClose?: () => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  deviceId,
  errorMessage: initialError,
  onSuccess,
  onClose,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError || '');
  const [isCopiedHwid, setIsCopiedHwid] = useState(false);

  if (!isOpen) return null;

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(deviceId);
    setIsCopiedHwid(true);
    setTimeout(() => setIsCopiedHwid(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    if (!cleanKey) {
      setErrorMsg('Vui lòng nhập mã bản quyền (License Key).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      if ((window as any).electronAPI?.activateLicense) {
        const res = await (window as any).electronAPI.activateLicense(cleanKey);
        if (res?.isValid) {
          onSuccess(res);
        } else {
          setErrorMsg(res?.errorMessage || 'Mã bản quyền không hợp lệ hoặc đã được sử dụng trên máy khác.');
        }
      } else {
        // Fallback môi trường Web preview
        setTimeout(() => {
          onSuccess({
            isValid: true,
            deviceId,
            licenseKey: cleanKey,
            tier: 'standard',
            expiresAt: '2026-12-31',
          });
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối máy chủ: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 2, 3, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(145deg, #1f0a0e 0%, #140508 100%)',
          border: '1.5px solid #881337',
          borderRadius: 20,
          padding: '30px 28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(230, 57, 70, 0.25)',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 12px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #e63946, #be123c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              boxShadow: '0 6px 18px rgba(230, 57, 70, 0.4)',
            }}
          >
            🔑
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
            Kích Hoạt Bản Quyền NexaLink
          </h2>
          <p style={{ fontSize: 12.5, color: '#fca5a5', marginTop: 4, lineHeight: 1.4 }}>
            Nhập mã License Key để kích hoạt phần mềm tuyển dụng LinkedIn tự động.
          </p>
        </div>

        <form onSubmit={handleActivate}>
          {/* Hardware ID Display */}
          <div
            style={{
              background: '#120407',
              border: '1px solid #380d16',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: '#9d8c8f', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                Mã Phần Cứng (Hardware ID 1 máy)
              </span>
              <code style={{ fontSize: 12.5, color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                {deviceId || 'Đang nhận diện HWID...'}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyHwid}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isCopiedHwid ? '✓ Đã chép' : 'Sao chép'}
            </button>
          </div>

          {/* License Key Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#f3e8ff', marginBottom: 6 }}>
              Mã Bản Quyền (License Key):
            </label>
            <input
              type="text"
              placeholder="SLK-1M-XXXX-YYYY hoặc NLK-..."
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: '#120407',
                border: '1.5px solid #631826',
                borderRadius: 10,
                color: '#ffffff',
                fontSize: 14,
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '1px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#fca5a5',
                fontSize: 12,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ghi chú quy tắc */}
          <div
            style={{
              fontSize: 11.5,
              color: '#9d8c8f',
              lineHeight: 1.4,
              marginBottom: 20,
              background: 'rgba(0,0,0,0.2)',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            🛡️ <em>Quy tắc: Mỗi mã bản quyền được gắn cố định với 1 máy tính duy nhất. Bạn có thể Hủy liên kết trong mục Cài đặt nếu cần chuyển app sang máy mới.</em>
          </div>

          {/* Nút hành động */}
          <div style={{ display: 'flex', gap: 10 }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #4a141e',
                  borderRadius: 10,
                  color: '#9d8c8f',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 2,
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #e63946, #be123c)',
                border: 'none',
                borderRadius: 10,
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)',
                transition: 'transform 0.15s ease',
              }}
            >
              {isLoading ? '⏳ Đang xác thực...' : '🚀 Kích Hoạt Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
