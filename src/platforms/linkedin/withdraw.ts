import { Page } from 'playwright-core';
import { Humanize } from '../../core/browser/humanize';

export interface WithdrawResult {
  totalWithdrawn: number;
  stoppedEarly: boolean;
  message: string;
}

/**
 * Module tự động dọn dẹp lời mời kết nối đang chờ (Pending Invites Cleaner):
 * - Rút bớt các lời mời gửi đi đã lâu mà không được chấp nhận
 * - Giữ Acceptance Rate ở mức cao, tránh bị LinkedIn gán cờ Spam / Shadowban
 */
export class LinkedInInviteCleaner {
  static readonly SENT_INVITATIONS_URL = 'https://www.linkedin.com/mynetwork/invitation-manager/sent/';

  /**
   * Quét và rút lại số lượng lời mời đang chờ theo giới hạn mong muốn
   * @param maxToWithdraw Số lượng tối đa cần rút trong phiên này (mặc định 15-20)
   */
  async withdrawOldInvites(
    page: Page,
    maxToWithdraw: number = 20,
    callbacks?: { onProgress?: (msg: string) => void; shouldStop?: () => boolean }
  ): Promise<WithdrawResult> {
    console.log(`[LI Cleaner] Bắt đầu kiểm tra và rút bớt tối đa ${maxToWithdraw} lời mời treo...`);
    callbacks?.onProgress?.(`Đang mở trang quản lý lời mời đã gửi...`);

    let withdrawnCount = 0;

    try {
      await page.goto(LinkedInInviteCleaner.SENT_INVITATIONS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 35000,
      });
      await Humanize.randomDelay(2500, 4500);

      while (withdrawnCount < maxToWithdraw) {
        if (callbacks?.shouldStop?.()) {
          return { totalWithdrawn: withdrawnCount, stoppedEarly: true, message: 'Đã dừng theo yêu cầu người dùng.' };
        }

        // Tìm tất cả các nút Withdraw trên trang
        const withdrawButtons = await page.$$(
          'button:has-text("Withdraw"), button:has-text("Rút lại"), button[aria-label*="Withdraw"], button[aria-label*="Rút lại"]'
        );

        if (withdrawButtons.length === 0) {
          console.log('[LI Cleaner] Không còn lời mời nào cần rút hoặc danh sách đã hết.');
          break;
        }

        // Chọn nút Withdraw đầu tiên trong danh sách
        const btn = withdrawButtons[0];
        await Humanize.clickElementNaturally(page, btn);
        await Humanize.randomDelay(1200, 2200);

        // Xác nhận trong hộp thoại modal: "Withdraw" / "Rút lại"
        const confirmBtn = await page.$(
          'div[role="alertdialog"] button:has-text("Withdraw"), div[role="alertdialog"] button:has-text("Rút lại"), div.artdeco-modal button.artdeco-button--primary'
        );

        if (confirmBtn) {
          await Humanize.clickElementNaturally(page, confirmBtn);
          withdrawnCount++;
          console.log(`[LI Cleaner] Đã rút thành công lời mời #${withdrawnCount}`);
          callbacks?.onProgress?.(`Đã rút thành công lời mời #${withdrawnCount}/${maxToWithdraw}`);
          await Humanize.randomDelay(2000, 4000);
        } else {
          console.warn('[LI Cleaner] Không tìm thấy nút xác nhận rút trong modal.');
          break;
        }
      }

      return {
        totalWithdrawn: withdrawnCount,
        stoppedEarly: false,
        message: `Đã hoàn tất rút ${withdrawnCount} lời mời đang chờ.`,
      };
    } catch (err: any) {
      console.error('[LI Cleaner] Lỗi trong quá trình rút lời mời:', err);
      return {
        totalWithdrawn: withdrawnCount,
        stoppedEarly: true,
        message: err.message || 'Lỗi khi rút lời mời.',
      };
    }
  }
}
