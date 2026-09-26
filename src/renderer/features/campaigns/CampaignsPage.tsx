import React, { useState, useEffect } from 'react';
import { Icons, OfficeCatMascot } from '../../components';
import { Campaign, Account, PlatformType } from '../../../shared/types';
import { CampaignFormModal } from './components/CampaignFormModal';
import { CampaignProgressModal } from './components/CampaignProgressModal';

interface CampaignsPageProps {
  platform: PlatformType;
}

const STORAGE_KEY_CAMPAIGNS = 'nexa_campaigns_';

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ platform }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Modals & Selection
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // Toast thông báo hiện đại
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tiến trình thời gian thực
  const [activeProgress, setActiveProgress] = useState<{
    campaignId: string;
    current: number;
    total: number;
    message: string;
    cooldownRemainingSeconds?: number;
  } | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      if ((window as any).electronAPI) {
        const allCamps = await (window as any).electronAPI.getCampaigns();
        setCampaigns(allCamps.filter((c: Campaign) => c.platform === platform));
        const allAccs = await (window as any).electronAPI.getAccounts();
        setAccounts(allAccs.filter((a: Account) => a.platform === platform));
      } else {
        const storageKey = `${STORAGE_KEY_CAMPAIGNS}${platform}`;
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          try {
            setCampaigns(JSON.parse(saved));
          } catch {}
        } else {
          setCampaigns([]);
        }

        const accSaved = localStorage.getItem(`nexa_accounts_${platform}`);
        if (accSaved) {
          try {
            setAccounts(JSON.parse(accSaved));
          } catch {}
        }
      }
    } catch (e) {
      console.error('Lỗi khi nạp dữ liệu chiến dịch:', e);
    }
  };

  useEffect(() => {
    loadData();

    if ((window as any).electronAPI) {
      const unsubProgress = (window as any).electronAPI.onCampaignProgress((data: any) => {
        setActiveProgress(data);
      });
      const unsubLog = (window as any).electronAPI.onCampaignLog((data: any) => {
        setLiveLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${data.message}`, ...prev.slice(0, 100)]);
      });
      const unsubStatus = (window as any).electronAPI.onCampaignStatusChanged((data: any) => {
        loadData();
        if (data && (data.status === 'completed' || data.status === 'stopped' || data.status === 'error')) {
          setActiveProgress((prev) => (prev?.campaignId === data.campaignId ? null : prev));
        }
      });

      return () => {
        unsubProgress?.();
        unsubLog?.();
        unsubStatus?.();
      };
    }
  }, [platform]);

  const saveWebCampaigns = (updated: Campaign[]) => {
    setCampaigns(updated);
    localStorage.setItem(`${STORAGE_KEY_CAMPAIGNS}${platform}`, JSON.stringify(updated));
  };

  // Lưu chiến dịch
  const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
    try {
      if ((window as any).electronAPI) {
        if (editingCampaign) {
          await (window as any).electronAPI.updateCampaign({ ...editingCampaign, ...campaignData });
          showToast(`Đã cập nhật chiến dịch "${campaignData.name}" thành công!`);
        } else {
          await (window as any).electronAPI.createCampaign(campaignData);
          showToast(`Đã tạo mới chiến dịch "${campaignData.name}" thành công!`);
        }
        await loadData();
      } else {
        if (editingCampaign) {
          const updated = campaigns.map((c) => (c.id === editingCampaign.id ? ({ ...c, ...campaignData } as Campaign) : c));
          saveWebCampaigns(updated);
        } else {
          saveWebCampaigns([campaignData as Campaign, ...campaigns]);
        }
        showToast(`Đã lưu chiến dịch "${campaignData.name}"!`);
      }

      setIsFormModalOpen(false);
      setEditingCampaign(null);
    } catch (e: any) {
      showToast(`Lỗi khi lưu chiến dịch: ${e.message}`);
    }
  };

  // Điều khiển vòng đời chiến dịch
  const handleStart = async (id: string) => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.startCampaign(id);
        await loadData();
      } else {
        const updated = campaigns.map((c) => (c.id === id ? { ...c, status: 'running' as const } : c));
        saveWebCampaigns(updated);
      }
      showToast('Đang khởi động chiến dịch tuyển dụng LinkedIn...');
    } catch (e: any) {
      showToast(`Lỗi khởi động: ${e.message}`);
    }
  };

  const handlePause = async (id: string) => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.pauseCampaign(id);
        await loadData();
      } else {
        const updated = campaigns.map((c) => (c.id === id ? { ...c, status: 'paused' as const } : c));
        saveWebCampaigns(updated);
      }
      showToast('Đã gửi lệnh tạm dừng chiến dịch.');
    } catch (e: any) {
      showToast(`Lỗi tạm dừng: ${e.message}`);
    }
  };

  const handleResume = async (id: string) => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.resumeCampaign(id);
        await loadData();
      } else {
        const updated = campaigns.map((c) => (c.id === id ? { ...c, status: 'running' as const } : c));
        saveWebCampaigns(updated);
      }
      showToast('Đang tiếp tục chạy chiến dịch...');
    } catch (e: any) {
      showToast(`Lỗi tiếp tục: ${e.message}`);
    }
  };

  const handleStop = async (id: string) => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.stopCampaign(id);
        setActiveProgress((prev) => (prev?.campaignId === id ? null : prev));
        await loadData();
      } else {
        const updated = campaigns.map((c) => (c.id === id ? { ...c, status: 'stopped' as const } : c));
        saveWebCampaigns(updated);
        setActiveProgress((prev) => (prev?.campaignId === id ? null : prev));
      }
      showToast('Đã dừng chiến dịch và đóng trình duyệt an toàn.');
    } catch (e: any) {
      showToast(`Lỗi dừng: ${e.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa chiến dịch "${name}" không?`)) {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.deleteCampaign(id);
        await loadData();
      } else {
        const updated = campaigns.filter((c) => c.id !== id);
        saveWebCampaigns(updated);
      }
      showToast(`Đã xóa chiến dịch "${name}".`);
    }
  };

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
            border: '1px solid var(--primary-red)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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
            Chiến dịch Tuyển dụng LinkedIn
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Tìm kiếm ứng viên theo chức danh & vị trí, tự động kết nối mô phỏng người thật 100% và bảo vệ tài khoản đa tầng.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingCampaign(null);
            setIsFormModalOpen(true);
          }}
        >
          <Icons.Plus />
          Tạo chiến dịch mới
        </button>
      </div>

      {/* Bảng danh sách Chiến dịch */}
      <div className="table-container" style={{ marginTop: 18 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Tên chiến dịch</th>
              <th style={{ width: '18%' }}>Tài khoản chạy</th>
              <th style={{ width: '20%' }}>Mục tiêu tìm kiếm</th>
              <th style={{ width: '12%' }}>Trạng thái</th>
              <th style={{ width: '10%' }}>Lời chào</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Điều khiển</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Chưa có chiến dịch LinkedIn nào. Bấm nút "+ Tạo chiến dịch mới" để bắt đầu kết nối tự động.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => {
                const accountName = accounts.find((a) => a.id === c.accountId)?.username || c.accountId;

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        ID: {c.id}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-sub)' }}>{accountName}</td>
                    <td>
                      <span style={{ fontSize: 13, color: '#f0e6e7' }}>
                        🎯 {c.maxConnections || 30} kết nối | 📍 {c.targetLocation || 'Mọi nơi'}
                      </span>
                      {c.targetKeywords?.[0] && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          Chức danh: <strong style={{ color: '#ffffff' }}>{c.targetKeywords[0]}</strong>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="status-badge">
                        <span
                          className={`status-dot ${
                            c.status === 'running' ? 'active' : 'inactive'
                          }`}
                        ></span>
                        <span
                          style={{
                            color:
                              c.status === 'running'
                                ? 'var(--status-active)'
                                : c.status === 'queued'
                                ? '#a78bfa'
                                : c.status === 'paused'
                                ? '#fbbf24'
                                : c.status === 'stopped'
                                ? '#f87171'
                                : c.status === 'completed'
                                ? '#60a5fa'
                                : 'var(--text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          {c.status === 'running'
                            ? 'Đang chạy'
                            : c.status === 'queued'
                            ? '⏳ Chờ hàng đợi'
                            : c.status === 'paused'
                            ? 'Tạm dừng'
                            : c.status === 'stopped'
                            ? 'Đã dừng'
                            : c.status === 'completed'
                            ? 'Hoàn thành'
                            : 'Bản nháp'}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#f0e6e7' }}>
                      {c.templateContent?.trim() ? '✨ Có ghi chú' : 'Không kèm note'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {c.status === 'running' ? (
                          <button
                            className="action-btn"
                            onClick={() => handlePause(c.id)}
                            title="Tạm dừng chiến dịch"
                            style={{ color: '#fbbf24' }}
                          >
                            ⏸
                          </button>
                        ) : c.status === 'paused' ? (
                          <button
                            className="action-btn"
                            onClick={() => handleResume(c.id)}
                            title="Tiếp tục chạy"
                            style={{ color: '#34d399' }}
                          >
                            ▶
                          </button>
                        ) : c.status === 'queued' ? (
                          <button
                            className="action-btn"
                            disabled
                            title="Đang xếp hàng chờ luồng trống..."
                            style={{ color: '#a78bfa', opacity: 0.6, cursor: 'wait' }}
                          >
                            ⏳
                          </button>
                        ) : (
                          <button
                            className="action-btn"
                            onClick={() => handleStart(c.id)}
                            title="Bắt đầu chạy (Kích hoạt)"
                            style={{ color: 'var(--status-active)' }}
                          >
                            ▶
                          </button>
                        )}
                        <button
                          className="action-btn"
                          onClick={() => handleStop(c.id)}
                          title="Dừng hẳn & Rời khỏi hàng đợi"
                          style={{
                            color: c.status === 'running' || c.status === 'paused' || c.status === 'queued' ? '#ef4444' : '#6b7280',
                            cursor: c.status === 'running' || c.status === 'paused' || c.status === 'queued' ? 'pointer' : 'not-allowed',
                            opacity: c.status === 'running' || c.status === 'paused' || c.status === 'queued' ? 1 : 0.4,
                          }}
                          disabled={c.status !== 'running' && c.status !== 'paused' && c.status !== 'queued'}
                        >
                          ⏹
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setEditingCampaign(c);
                            setIsFormModalOpen(true);
                          }}
                          title="Chỉnh sửa thông tin chiến dịch"
                          style={{ color: '#60a5fa' }}
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => setIsProgressModalOpen(true)}
                          title="Xem tiến trình / Nhật ký"
                        >
                          📜
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(c.id, c.name)} title="Xóa">
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

      {/* Modal Tạo/Sửa Chiến dịch Tuyển dụng */}
      <CampaignFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCampaign(null);
        }}
        onSave={handleSaveCampaign}
        editingCampaign={editingCampaign}
        accounts={accounts}
      />

      {/* Modal Xem Tiến Trình & Live Logs */}
      <CampaignProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        activeProgress={activeProgress}
        liveLogs={liveLogs}
      />

      {/* Mascot Mèo Công Sở */}
      <OfficeCatMascot
        activeProgress={activeProgress}
        runningCount={campaigns.filter((c) => c.status === 'running').length}
        isPaused={campaigns.some((c) => c.status === 'paused')}
        onOpenLogs={() => setIsProgressModalOpen(true)}
        onPauseCampaign={handlePause}
        onResumeCampaign={handleResume}
        onStopCampaign={handleStop}
      />
    </div>
  );
};
