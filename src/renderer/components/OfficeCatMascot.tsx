import React, { useState } from 'react';

export interface OfficeCatMascotProps {
  activeProgress: {
    campaignId: string;
    current: number;
    total: number;
    message: string;
    cooldownRemainingSeconds?: number;
  } | null;
  runningCount: number;
  isPaused?: boolean;
  onOpenLogs?: () => void;
  onPauseCampaign?: (id: string) => void;
  onResumeCampaign?: (id: string) => void;
  onStopCampaign?: (id: string) => void;
}

export type MascotState = 'sleeping' | 'working' | 'overload' | 'cooldown';

export const OfficeCatMascot: React.FC<OfficeCatMascotProps> = ({
  activeProgress,
  runningCount,
  isPaused,
  onOpenLogs,
  onPauseCampaign,
  onResumeCampaign,
  onStopCampaign,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Xác định trạng thái của Mèo
  let mascotState: MascotState = 'sleeping';
  if (isPaused) {
    mascotState = 'cooldown';
  } else if (activeProgress?.cooldownRemainingSeconds && activeProgress.cooldownRemainingSeconds > 0) {
    mascotState = 'cooldown';
  } else if (runningCount >= 2) {
    mascotState = 'overload';
  } else if (runningCount >= 1 || activeProgress) {
    mascotState = 'working';
  } else {
    mascotState = 'sleeping';
  }

  // Nội dung bong bóng chat
  const getBubbleText = () => {
    if (isPaused) {
      return '⏸ Đang tạm dừng... Nhấn Tiếp tục để chạy tiếp! ☕';
    }
    switch (mascotState) {
      case 'sleeping':
        return 'Hết việc rồi sếp, em chợp mắt tí nha... Zzz 💤';
      case 'cooldown':
        return `⏳ Nghỉ an toàn chống checkpoint: Còn ${activeProgress?.cooldownRemainingSeconds}s... ☕`;
      case 'overload':
        return `🔥 Đang cày ${runningCount} job song song! Cố lên nào!`;
      case 'working':
        return activeProgress?.message
          ? `${activeProgress.message} (${activeProgress.current}/${activeProgress.total})`
          : 'Đang chạy tự động hóa... 💼';
    }
  };

  const percent =
    activeProgress && activeProgress.total > 0
      ? Math.min(100, Math.round((activeProgress.current / activeProgress.total) * 100))
      : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        right: 24,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        userSelect: 'none',
      }}
    >
      {/* 1. Popover Chi tiết Tiến trình (Khi click vào Mèo) */}
      {isPopoverOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 125,
            right: 0,
            width: 350,
            background: 'linear-gradient(145deg, #240c12 0%, #17070a 100%)',
            border: '1px solid #7f1d2d',
            borderRadius: 14,
            padding: 18,
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75), 0 0 15px rgba(230, 57, 70, 0.25)',
            color: '#ffffff',
            animation: 'cat-popover-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transformOrigin: 'bottom right',
          }}
        >
          {/* Popover Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #3d141c',
              paddingBottom: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🐱</span>
              <strong style={{ fontSize: 13.5, color: '#fecdd3' }}>NexaCat Tiến Trình</strong>
            </div>
            <button
              onClick={() => setIsPopoverOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: 16,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
              }}
              title="Đóng"
            >
              ✕
            </button>
          </div>

          {/* Popover Body */}
          {activeProgress ? (
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  padding: '3px 8px',
                  borderRadius: 20,
                  marginBottom: 10,
                  background:
                    mascotState === 'cooldown' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                  color: mascotState === 'cooldown' ? '#fbbf24' : '#34d399',
                  border: `1px solid ${
                    mascotState === 'cooldown' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(52, 211, 153, 0.3)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: mascotState === 'cooldown' ? '#fbbf24' : '#34d399',
                  }}
                />
                {mascotState === 'cooldown' ? 'Đang nghỉ an toàn' : 'Đang xử lý đăng bài'}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>
                {activeProgress.message}
              </div>

              {activeProgress.cooldownRemainingSeconds && activeProgress.cooldownRemainingSeconds > 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: '#fbbf24',
                    background: '#2f1807',
                    padding: '6px 10px',
                    borderRadius: 6,
                    marginBottom: 10,
                    border: '1px solid #78350f',
                  }}
                >
                  ⏳ Nghỉ chống checkpoint: Còn{' '}
                  <strong>{activeProgress.cooldownRemainingSeconds}s...</strong>
                </div>
              ) : null}

              {/* Progress Bar */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#cbd5e1',
                    marginBottom: 4,
                  }}
                >
                  <span>Tiến độ bài viết</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>
                    {activeProgress.current} / {activeProgress.total} nhóm ({percent}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: '#20070a',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #3d141c',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      background: 'linear-gradient(90deg, #e63946, #34d399)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {onOpenLogs && (
                  <button
                    onClick={() => {
                      onOpenLogs();
                      setIsPopoverOpen(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      background: '#37141b',
                      border: '1px solid #631d2b',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    📜 Xem Logs
                  </button>
                )}

                {activeProgress.campaignId && (
                  <>
                    {isPaused ? (
                      onResumeCampaign && (
                        <button
                          onClick={() => {
                            onResumeCampaign(activeProgress.campaignId);
                          }}
                          style={{
                            padding: '7px 10px',
                            background: '#064e3b',
                            border: '1px solid #059669',
                            borderRadius: 6,
                            color: '#6ee7b7',
                            fontSize: 11.5,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Tiếp tục chiến dịch"
                        >
                          ▶ Tiếp tục
                        </button>
                      )
                    ) : (
                      onPauseCampaign && (
                        <button
                          onClick={() => {
                            onPauseCampaign(activeProgress.campaignId);
                          }}
                          style={{
                            padding: '7px 10px',
                            background: '#451a03',
                            border: '1px solid #d97706',
                            borderRadius: 6,
                            color: '#fde68a',
                            fontSize: 11.5,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Tạm dừng chiến dịch"
                        >
                          ⏸ Tạm dừng
                        </button>
                      )
                    )}

                    {onStopCampaign && (
                      <button
                        onClick={() => {
                          onStopCampaign(activeProgress.campaignId);
                          setIsPopoverOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          background: '#450a0a',
                          border: '1px solid #991b1b',
                          borderRadius: 6,
                          color: '#fca5a5',
                          fontSize: 11.5,
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                        title="Dừng hẳn chiến dịch và đóng trình duyệt"
                      >
                        ⏹ Dừng hẳn
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 0', textAlign: 'center', color: '#9d8c8f', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>😴</div>
              <div style={{ color: '#f3e8ff', fontWeight: 600, marginBottom: 4 }}>
                Không có chiến dịch nào đang chạy
              </div>
              <div style={{ fontSize: 11.5 }}>
                Mèo đang nằm ngủ giữ sức. Hãy bấm nút <strong>▶ Bắt đầu</strong> ở danh sách chiến dịch để mèo làm việc nhé!
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Bong bóng Chat (Speech Bubble) */}
      <div
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        style={{
          maxWidth: 240,
          background: '#1c0a0e',
          border: '1.5px solid #881337',
          borderRadius: 14,
          borderBottomRightRadius: 2,
          padding: '7px 12px',
          marginBottom: 6,
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.2s, border-color 0.2s',
          transform: isHovered ? 'scale(1.03)' : 'scale(1)',
          borderColor: isHovered ? '#e63946' : '#881337',
        }}
        title="Nhấn để xem chi tiết tiến trình"
      >
        <div
          style={{
            fontSize: 11.5,
            color: '#fecdd3',
            lineHeight: 1.35,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {getBubbleText()}
        </div>

        {/* Đuôi nhọn bong bóng thoại */}
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            right: 28,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #881337',
          }}
        />
      </div>

      {/* 3. Con Mèo Công Sở 2D (Interactive Vector Illustration) */}
      <div
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          cursor: 'pointer',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}
        title={
          mascotState === 'sleeping'
            ? 'Mèo đang ngủ (0 job) - Nhấn để mở thẻ quản lý'
            : `Mèo đang làm việc (${runningCount} job) - Nhấn để xem chi tiết`
        }
      >
        {/* Huy hiệu số Job (Badge) */}
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: 2,
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: mascotState === 'sleeping' ? '#4b5563' : '#e63946',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #140a0c',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            zIndex: 10,
            animation: mascotState !== 'sleeping' ? 'cat-badge-pulse 2s infinite' : 'none',
          }}
        >
          {runningCount > 0 ? runningCount : 'Zzz'}
        </div>

        {/* SVG Linh vật Mèo Công Sở 2D */}
        <svg
          width="116"
          height="104"
          viewBox="0 0 116 104"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bàn làm việc (Desk) */}
          <rect x="4" y="80" width="108" height="12" rx="3" fill="#3e171f" stroke="#5f2330" strokeWidth="1.5" />
          <rect x="10" y="92" width="8" height="12" fill="#290f14" />
          <rect x="98" y="92" width="8" height="12" fill="#290f14" />

          {/* Cốc cà phê trên bàn */}
          <rect x="14" y="66" width="12" height="14" rx="2" fill="#f87171" />
          <path d="M26 70 C29 70 29 76 26 76" stroke="#f87171" strokeWidth="2" fill="none" />
          <line x1="16" y1="67" x2="24" y2="67" stroke="#450a0a" strokeWidth="2" />
          {/* Hơi khói bốc lên từ cà phê */}
          {(mascotState === 'working' || mascotState === 'overload' || mascotState === 'cooldown') && (
            <g className="cat-steam-anim">
              <path
                d="M17 63 C16 60 19 58 18 55"
                stroke="#fda4af"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d="M22 62 C23 59 20 57 21 54"
                stroke="#fda4af"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.75"
              />
            </g>
          )}

          {/* Đuôi mèo ngoe nguẩy ở phía sau */}
          <path
            d="M92 78 C102 74 105 60 98 54"
            stroke="#f59e0b"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            className={mascotState === 'sleeping' ? '' : 'cat-tail-anim'}
          />

          {/* --- NẾU MÈO ĐANG NGỦ (SLEEPING) --- */}
          {mascotState === 'sleeping' && (
            <g>
              {/* Thân mèo nằm gục trên bàn */}
              <ellipse cx="60" cy="74" rx="28" ry="14" fill="#f59e0b" />
              {/* Lưng áo sơ mi công sở trắng */}
              <ellipse cx="58" cy="73" rx="16" ry="10" fill="#ffffff" opacity="0.9" />
              <path d="M54 68 L60 74 L57 78" stroke="#e63946" strokeWidth="2.5" strokeLinecap="round" />

              {/* Đầu mèo gối má trên bàn */}
              <circle cx="44" cy="70" r="16" fill="#f59e0b" />
              {/* Tai mèo rũ xuống */}
              <polygon points="32,60 38,50 44,58" fill="#d97706" />
              <polygon points="34,59 38,53 42,58" fill="#fbcfe8" />
              <polygon points="46,58 52,50 56,60" fill="#d97706" />
              <polygon points="48,58 52,53 54,59" fill="#fbcfe8" />

              {/* Mắt mèo nhắm tít ngủ (⌒ ⌒) */}
              <path d="M37 69 Q40 66 43 69" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M46 69 Q49 66 52 69" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              {/* Mũi hồng */}
              <polygon points="44,72 46,72 45,74" fill="#f43f5e" />

              {/* Laptop gập hờ trên bàn */}
              <rect x="68" y="77" width="26" height="4" rx="1" fill="#64748b" />
              <line x1="68" y1="77" x2="88" y2="68" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />

              {/* Chữ Zzz bay lên bồng bềnh */}
              <g className="cat-zzz-anim">
                <text x="32" y="44" fill="#f472b6" fontSize="12" fontWeight="800">z</text>
                <text x="39" y="34" fill="#fb7185" fontSize="14" fontWeight="800">Z</text>
                <text x="48" y="24" fill="#e63946" fontSize="17" fontWeight="900">Z</text>
              </g>
            </g>
          )}

          {/* --- NẾU MÈO ĐANG LÀM VIỆC (WORKING / OVERLOAD / COOLDOWN) --- */}
          {mascotState !== 'sleeping' && (
            <g>
              {/* Thân mèo ngồi thẳng */}
              <ellipse cx="62" cy="62" rx="20" ry="18" fill="#f59e0b" />
              {/* Áo sơ mi trắng công sở */}
              <path d="M48 60 Q62 55 76 60 L74 76 Q62 79 50 76 Z" fill="#ffffff" />
              {/* Cà vạt đỏ NexaSocial */}
              <polygon points="61,59 64,59 65,71 62.5,75 60,71" fill="#e63946" />

              {/* Đầu mèo */}
              <circle cx="62" cy="40" r="18" fill="#f59e0b" />
              {/* Má phúng phính trắng */}
              <ellipse cx="62" cy="46" rx="10" ry="6" fill="#fef3c7" />

              {/* Hai tai mèo vểnh lên nghe ngóng */}
              <polygon points="46,32 48,16 60,26" fill="#d97706" />
              <polygon points="49,30 50,20 57,26" fill="#fbcfe8" />
              <polygon points="64,26 76,16 78,32" fill="#d97706" />
              <polygon points="67,26 74,20 75,30" fill="#fbcfe8" />

              {/* Kính trí thức của Mèo */}
              <circle cx="56" cy="40" r="6" stroke="#0284c7" strokeWidth="1.8" fill="rgba(2, 132, 199, 0.15)" />
              <circle cx="68" cy="40" r="6" stroke="#0284c7" strokeWidth="1.8" fill="rgba(2, 132, 199, 0.15)" />
              <line x1="62" y1="40" x2="62" y2="40" stroke="#0284c7" strokeWidth="2" />

              {/* Mắt mèo theo trạng thái */}
              {mascotState === 'overload' ? (
                // Mắt tập trung cao độ (> <)
                <g stroke="#78350f" strokeWidth="2" strokeLinecap="round" fill="none">
                  <path d="M53 38 L58 40 L53 42" />
                  <path d="M71 38 L66 40 L71 42" />
                </g>
              ) : mascotState === 'cooldown' ? (
                // Mắt cười híp thư giãn (⌒ ⌒)
                <g stroke="#78350f" strokeWidth="2" strokeLinecap="round" fill="none">
                  <path d="M53 41 Q56 38 59 41" />
                  <path d="M65 41 Q68 38 71 41" />
                </g>
              ) : (
                // Mắt tròn tập trung (● ●)
                <g fill="#78350f">
                  <circle cx="56" cy="40" r="2.4" />
                  <circle cx="68" cy="40" r="2.4" />
                  <circle cx="57" cy="39" r="0.8" fill="#ffffff" />
                  <circle cx="69" cy="39" r="0.8" fill="#ffffff" />
                </g>
              )}

              {/* Mũi & Miệng mèo */}
              <polygon points="61,46 63,46 62,48" fill="#f43f5e" />
              <path d="M59 49 Q62 51 65 49" stroke="#78350f" strokeWidth="1.2" fill="none" strokeLinecap="round" />

              {/* Râu mèo */}
              <line x1="42" y1="44" x2="49" y2="45" stroke="#d97706" strokeWidth="1.2" />
              <line x1="42" y1="48" x2="49" y2="48" stroke="#d97706" strokeWidth="1.2" />
              <line x1="75" y1="45" x2="82" y2="44" stroke="#d97706" strokeWidth="1.2" />
              <line x1="75" y1="48" x2="82" y2="48" stroke="#d97706" strokeWidth="1.2" />

              {/* Laptop & Ánh sáng màn hình */}
              <rect x="74" y="78" width="24" height="3" rx="1" fill="#475569" />
              <polygon points="80,56 94,56 98,78 84,78" fill="#0284c7" opacity="0.85" />
              {/* Logo Nexa nhỏ trên laptop */}
              <circle cx="89" cy="67" r="2.5" fill="#ffffff" opacity="0.9" />

              {/* Đôi bàn tay (Paws) */}
              {mascotState === 'cooldown' ? (
                // Đang cầm tách cà phê
                <g>
                  <ellipse cx="50" cy="74" rx="4" ry="3" fill="#fef3c7" />
                  <ellipse cx="62" cy="72" rx="4" ry="3" fill="#fef3c7" />
                </g>
              ) : (
                // Hai tay gõ bàn phím nhịp nhàng
                <g className={mascotState === 'overload' ? 'cat-typing-fast' : 'cat-typing-normal'}>
                  <ellipse cx="78" cy="75" rx="4.5" ry="3" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
                  <ellipse cx="86" cy="75" rx="4.5" ry="3" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
                </g>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
