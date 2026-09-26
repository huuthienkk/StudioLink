import React from 'react';
import { Modal } from '../../../components';

interface CampaignProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProgress: {
    campaignId: string;
    current: number;
    total: number;
    message: string;
    cooldownRemainingSeconds?: number;
  } | null;
  liveLogs: string[];
}

export const CampaignProgressModal: React.FC<CampaignProgressModalProps> = ({
  isOpen,
  onClose,
  activeProgress,
  liveLogs,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhật Ký Tiến Trình Tự Động Hóa LinkedIn Thời Gian Thực"
      maxWidth="720px"
    >
      <div>
        {activeProgress ? (
          <div style={{ marginBottom: 14, padding: 12, background: '#1c0a0e', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <strong style={{ color: '#ffffff' }}>Trạng thái: {activeProgress.message}</strong>
              <span style={{ color: 'var(--status-active)', fontWeight: 600 }}>
                {activeProgress.current} / {activeProgress.total} kết nối
              </span>
            </div>
            <div style={{ height: 6, background: '#301117', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((activeProgress.current / (activeProgress.total || 1)) * 100))}%`,
                  background: 'var(--primary-red)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Hiện không có chiến dịch nào đang chạy.
          </p>
        )}

        <div
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            background: '#0d0507',
            padding: 12,
            borderRadius: 8,
            border: '1px solid #2e1218',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.5,
            color: '#d4c2c5',
          }}
        >
          {liveLogs.length === 0 ? (
            <div style={{ color: '#7a676b' }}>Chưa có nhật ký hoạt động mới.</div>
          ) : (
            liveLogs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
