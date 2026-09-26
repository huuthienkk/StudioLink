import React from 'react';
import { Icons, Modal, FormInput, FormTextarea } from '../../../components';
import { Campaign, Account } from '../../../../shared/types';

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaignData: Partial<Campaign>) => Promise<void>;
  editingCampaign: Campaign | null;
  accounts: Account[];
}

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCampaign,
  accounts,
}) => {
  const [name, setName] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [targetKeyword, setTargetKeyword] = React.useState('');
  const [targetLocation, setTargetLocation] = React.useState('');
  const [maxConnections, setMaxConnections] = React.useState(30);
  const [templateContent, setTemplateContent] = React.useState('');
  const [secondDegreeOnly, setSecondDegreeOnly] = React.useState(true);
  const [dailyLimit, setDailyLimit] = React.useState(30);
  const [minDelay, setMinDelay] = React.useState(25);
  const [maxDelay, setMaxDelay] = React.useState(60);

  React.useEffect(() => {
    if (editingCampaign) {
      setName(editingCampaign.name);
      setAccountId(editingCampaign.accountId);
      setTargetKeyword(editingCampaign.targetKeywords?.[0] || '');
      setTargetLocation(editingCampaign.targetLocation || '');
      setMaxConnections(editingCampaign.maxConnections || 30);
      setSecondDegreeOnly(editingCampaign.secondDegreeOnly !== undefined ? editingCampaign.secondDegreeOnly : true);
      setTemplateContent(editingCampaign.templateContent || '');
      setDailyLimit(editingCampaign.scheduleConfig?.dailyLimit || 30);
      setMinDelay(editingCampaign.scheduleConfig?.intervalDelaySeconds?.min || 25);
      setMaxDelay(editingCampaign.scheduleConfig?.intervalDelaySeconds?.max || 60);
    } else {
      setName('');
      setAccountId(accounts.length > 0 ? accounts[0].id : '');
      setTargetKeyword('CEO');
      setTargetLocation('Vietnam');
      setMaxConnections(30);
      setSecondDegreeOnly(true);
      setTemplateContent('Chào {name}, mình thấy hồ sơ của bạn rất ấn tượng và rất mong được kết nối cùng bạn!');
      setDailyLimit(30);
      setMinDelay(25);
      setMaxDelay(60);
    }
  }, [editingCampaign, isOpen, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!accountId) return;

    await onSave({
      id: editingCampaign?.id || `camp_${Date.now()}`,
      name: name.trim(),
      platform: 'linkedin',
      accountId,
      targetKeywords: [targetKeyword.trim() || 'CEO'],
      targetLocation: targetLocation.trim() || undefined,
      secondDegreeOnly,
      maxConnections,
      templateContent: templateContent.trim(),
      scheduleConfig: {
        dailyLimit,
        intervalDelaySeconds: { min: minDelay, max: maxDelay },
        allowedTimeWindows: [],
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCampaign ? 'Chỉnh sửa Chiến dịch LinkedIn' : 'Thiết lập Chiến dịch Tuyển dụng LinkedIn Mới'}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hàng 1: Tên & Tài khoản */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              Tên chiến dịch (*)
            </label>
            <FormInput
              type="text"
              placeholder="VD: Kết nối Giám đốc Kinh doanh Q3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              Tài khoản LinkedIn kết nối (*)
            </label>
            <select
              className="form-input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username} ({a.proxyUrl || 'Không proxy'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc Nhân sự */}
        <div
          style={{
            background: '#160b0e',
            padding: 14,
            borderRadius: 10,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: '#ffffff' }}>
              🔍 Mục tiêu Tìm kiếm Nhân sự (People Search Filters)
            </span>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Hệ thống tự động tìm kiếm chức danh và áp dụng bộ lọc vị trí địa lý của LinkedIn qua giao diện thật.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 100px', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 5 }}>
                Chức danh / Từ khóa (*)
              </label>
              <FormInput
                type="text"
                placeholder="VD: CEO, Founder, HR Director, Senior Developer..."
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 5 }}>
                Vị trí địa lý (Locations)
              </label>
              <FormInput
                type="text"
                placeholder="VD: Vietnam, Ho Chi Minh, Hanoi, Singapore..."
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 5 }}>
                Mục tiêu gửi
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="form-input"
                style={{ width: '100%', textAlign: 'center' }}
                value={maxConnections}
                onChange={(e) => setMaxConnections(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                title="Số lượng kết nối muốn gửi trong chiến dịch này"
              />
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="secondDegreeCheckbox"
              checked={secondDegreeOnly}
              onChange={(e) => setSecondDegreeOnly(e.target.checked)}
              style={{ accentColor: 'var(--primary-color, #0a66c2)', cursor: 'pointer', width: 16, height: 16 }}
            />
            <label htmlFor="secondDegreeCheckbox" style={{ fontSize: 12.5, color: '#e0e0e0', cursor: 'pointer' }}>
              🛡️ <strong>Chỉ tìm kiếm mạng lưới cấp 2 (2nd-degree)</strong>{' '}
              <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                (Khuyên dùng: Tăng tỷ lệ đồng ý kết nối, triệt tiêu phản hồi "I don't know this person")
              </span>
            </label>
          </div>
        </div>

        {/* Hàng 3: Lời chào kết nối cá nhân hóa */}
        <div
          style={{
            background: '#160b0e',
            padding: 14,
            borderRadius: 10,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: '#ffffff' }}>
                ✉️ Lời chào kết nối cá nhân hóa (Add a note)
              </span>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Sử dụng biến <code style={{ color: 'var(--primary-red)' }}>{'{name}'}</code> để tự động chèn tên ứng viên. Để trống nếu muốn gửi kết nối trực tiếp.
              </p>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: templateContent.length > 200 ? 'var(--status-error)' : 'var(--text-muted)',
                background: '#110709',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
              }}
            >
              {templateContent.length} / 200 ký tự
            </div>
          </div>

          <FormTextarea
            rows={3}
            placeholder="VD: Chào {name}, mình thấy hồ sơ của bạn rất phù hợp với dự án sắp tới và muốn kết nối để trao đổi thêm!"
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
          />

          <div style={{ marginTop: 8, fontSize: 11.5, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🛡️ Cơ chế Fallback an toàn:</span>
            <span style={{ color: 'var(--text-muted)' }}>
              Nếu tài khoản hết hạn mức gửi ghi chú miễn phí trong tháng của LinkedIn, hệ thống sẽ tự động fallback sang gửi kết nối trực tiếp để chiến dịch không bị gián đoạn.
            </span>
          </div>
        </div>

        {/* Hàng 4: Cấu hình an toàn & Giãn cách chống ban */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            background: '#160b0e',
            padding: 12,
            borderRadius: 10,
            fontSize: 12.5,
            color: 'var(--text-muted)',
          }}
        >
          <div>
            <span>Giới hạn tối đa/ngày: </span>
            <input
              type="number"
              className="form-input"
              style={{ width: 65, display: 'inline-block', padding: '4px 8px', marginLeft: 6 }}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value) || 30)}
            />
          </div>

          <div>
            <span>Delay giữa 2 kết nối: </span>
            <input
              type="number"
              className="form-input"
              style={{ width: 60, display: 'inline-block', padding: '4px 8px', marginLeft: 6 }}
              value={minDelay}
              onChange={(e) => setMinDelay(Number(e.target.value) || 25)}
            />
            <span style={{ margin: '0 4px' }}>-</span>
            <input
              type="number"
              className="form-input"
              style={{ width: 60, display: 'inline-block', padding: '4px 8px' }}
              value={maxDelay}
              onChange={(e) => setMaxDelay(Number(e.target.value) || 60)}
            />
            <span style={{ marginLeft: 4 }}>giây</span>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 11.5, color: '#34d399' }}>
            🛡️ Khoảng nghỉ an toàn chống LinkedIn ban nick
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn-primary">
            {editingCampaign ? '💾 Cập nhật chiến dịch' : '💾 Lưu chiến dịch'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
