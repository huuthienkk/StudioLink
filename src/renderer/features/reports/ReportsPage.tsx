import React, { useState, useEffect } from 'react';
import { ReportRecord, PlatformType } from '../../../shared/types';

interface ReportsPageProps {
  platform: PlatformType;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ platform }) => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      if ((window as any).electronAPI) {
        const all = await (window as any).electronAPI.getReports();
        setReports(all.filter((r: ReportRecord) => r.platform === platform));
      } else {
        setReports([
          {
            id: 'rep_1',
            campaignId: 'camp_li_1',
            platform: 'linkedin',
            accountId: 'acc_1',
            targetIdentifier: 'https://linkedin.com/in/nguyen-van-a-ceo',
            status: 'success',
            message: 'Đã gửi lời mời kết nối kèm lời chào cá nhân hóa tới Nguyen Van A.',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'rep_2',
            campaignId: 'camp_li_1',
            platform: 'linkedin',
            accountId: 'acc_1',
            targetIdentifier: 'https://linkedin.com/in/tran-thi-b-founder',
            status: 'success',
            message: 'Đã gửi lời mời kết nối trực tiếp tới Tran Thi B.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error('Lỗi khi nạp báo cáo:', e);
    }
  };

  useEffect(() => {
    loadReports();
  }, [platform]);

  const handleExportExcel = async () => {
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.exportExcel();
        if (res.success) {
          setExportMessage(`Xuất Excel thành công! Lưu tại: ${res.filePath}`);
        } else {
          setExportMessage(res.message || 'Không có dữ liệu để xuất');
        }
      } else {
        setExportMessage('Đã xuất Excel mẫu thành công (Mockup)');
      }
    } catch (e: any) {
      setExportMessage(`Lỗi: ${e.message}`);
    }
  };

  const total = reports.length;
  const successCount = reports.filter((r) => r.status === 'success').length;
  const failedCount = reports.filter((r) => r.status === 'failed').length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const formatFriendlyMessage = (msg?: string): { summary: string; full: string } => {
    if (!msg) return { summary: '-', full: '-' };
    const clean = msg.replace(/\u001b\[[0-9;]*m/g, '').trim();

    if (clean.includes('intercepts pointer events') || (clean.includes('Timeout') && clean.includes('click'))) {
      return { summary: 'Bị che bởi hộp thoại/quy tắc nhóm hoặc mạng chậm', full: clean };
    }
    if (clean.includes('Target closed') || clean.includes('browser has been closed') || clean.includes('Target page, context or browser has been closed')) {
      return { summary: 'Đã dừng hoặc trình duyệt bị đóng', full: clean };
    }
    if (clean.includes('Navigation timeout') || clean.includes('net::ERR_') || (clean.includes('Timeout') && clean.includes('goto'))) {
      return { summary: 'Mạng chậm hoặc không tải được trang', full: clean };
    }
    if (clean.includes('checkpoint') || clean.includes('Checkpoint')) {
      return { summary: 'Tài khoản dính checkpoint xác minh', full: clean };
    }

    const firstLine = clean.split('\n')[0].trim();
    const summary = firstLine.length > 70 ? firstLine.substring(0, 67) + '...' : firstLine;
    return { summary: summary || '-', full: clean };
  };
  const platformTitle = platform === 'facebook' ? 'Facebook' : 'LinkedIn';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
            Báo cáo {platformTitle}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Theo dõi lịch sử thực thi thời gian thực và xuất dữ liệu chi tiết.
          </p>
        </div>
        <button className="btn-primary" onClick={handleExportExcel}>
          📥 Xuất file Excel (.xlsx)
        </button>
      </div>

      {exportMessage && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 16px',
            backgroundColor: '#201215',
            border: '1px solid var(--primary-red)',
            borderRadius: 8,
            fontSize: 13,
            color: '#f0e6e7',
          }}
        >
          {exportMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: 18, borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>Tổng số tác vụ</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>{total}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: 18, borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>Thành công</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-active)' }}>{successCount}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: 18, borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>Thất bại / Bỏ qua</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-error)' }}>{failedCount}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: 18, borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>Tỷ lệ thành công</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#60a5fa' }}>{successRate}%</div>
        </div>
      </div>

      {/* Bảng dữ liệu chi tiết */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Mục tiêu (Nhóm / Profile)</th>
              <th style={{ width: '18%' }}>Chiến dịch</th>
              <th style={{ width: '18%' }}>Trạng thái</th>
              <th style={{ width: '24%' }}>Chi tiết thông báo</th>
              <th style={{ width: '18%' }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Chưa có nhật ký hoạt động nào. Khi chiến dịch chạy, dữ liệu sẽ hiển thị tại đây.
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: '#ffffff', wordBreak: 'break-all' }}>{r.targetIdentifier}</td>
                  <td style={{ color: 'var(--text-sub)' }}>{r.campaignId}</td>
                  <td>
                    <div className="status-badge">
                      <span className={`status-dot ${r.status === 'success' ? 'active' : 'error'}`}></span>
                      <span style={{ color: r.status === 'success' ? 'var(--status-active)' : 'var(--status-error)' }}>
                        {r.status === 'success' ? 'Thành công' : 'Thất bại'}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{ color: 'var(--text-muted)', fontSize: 12.5 }}
                    title={formatFriendlyMessage(r.message).full}
                  >
                    {formatFriendlyMessage(r.message).summary}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                    {new Date(r.timestamp).toLocaleTimeString()} {new Date(r.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
