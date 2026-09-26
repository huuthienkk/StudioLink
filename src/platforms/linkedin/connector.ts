import { Page, ElementHandle } from 'playwright-core';
import { LI_SELECTORS } from './selectors';
import { Humanize } from '../../core/browser/humanize';

export interface ConnectResult {
  success: boolean;
  message?: string;
  alreadyConnectedOrPending?: boolean;
  limitReached?: boolean;
}

export class LinkedInConnector {
  /**
   * Bấm nút Connect trực tiếp trên thẻ ứng viên trong danh sách kết quả tìm kiếm.
   * Di chuyển chuột Bezier, click tự nhiên như người dùng thật.
   */
  async connectOnResultCard(
    page: Page,
    cardElement: ElementHandle,
    customMessageTemplate?: string,
    leadName?: string
  ): Promise<ConnectResult> {
    try {
      // 1. Cuộn nhẹ thẻ ứng viên vào vùng nhìn thấy
      await cardElement.scrollIntoViewIfNeeded().catch(() => {});
      await Humanize.randomDelay(800, 1500);

      // 2. Tìm nút Connect trên thẻ
      let connectBtn: ElementHandle | null = null;
      for (const sel of LI_SELECTORS.connector.connectButtons) {
        connectBtn = await cardElement.$(sel);
        if (connectBtn && (await connectBtn.isVisible().catch(() => false))) {
          break;
        }
      }

      // 3. Nếu không có nút Connect, kiểm tra xem đã Pending hoặc chỉ cho Follow/Message
      if (!connectBtn) {
        const isPending = await cardElement.$('button:has-text("Pending"), button:has-text("Đang chờ")');
        if (isPending) {
          return { success: false, alreadyConnectedOrPending: true, message: 'Đã gửi lời mời trước đó (Pending).' };
        }
        return { success: false, message: 'Thẻ không có nút Connect (chỉ cho Follow hoặc đã kết nối).' };
      }

      // 4. Bấm nút Connect trên thẻ theo thao tác chuột tự nhiên
      console.log(`[LI Connector] Bấm nút Connect cho ứng viên: ${leadName || 'Hồ sơ'}...`);
      try {
        await Humanize.clickElementNaturally(page, connectBtn);
      } catch {
        await connectBtn.click().catch(() => {});
      }

      await Humanize.randomDelay(1500, 2500);

      // 5. Kiểm tra cảnh báo chạm trần giới hạn tuần (Weekly invitation limit reached)
      const isLimitReached = await page.evaluate((indicators) => {
        const bodyText = document.body.innerText;
        return indicators.some((ind) => bodyText.includes(ind));
      }, LI_SELECTORS.connector.weeklyLimitIndicators);

      if (isLimitReached) {
        return {
          success: false,
          limitReached: true,
          message: 'Đã chạm trần giới hạn kết nối trong tuần của LinkedIn! Tự động dừng để bảo vệ tài khoản.',
        };
      }

      // 6. Xử lý hộp thoại "Add a note to your invitation?" (nếu xuất hiện)
      const addNoteBtn = await page.$(LI_SELECTORS.connector.modalAddNoteButton);
      const sendWithoutNoteBtn = await page.$(LI_SELECTORS.connector.modalSendWithoutNoteButton);

      if (addNoteBtn || sendWithoutNoteBtn) {
        // Kiểm tra xem tài khoản có bị hết quota note của tháng không
        const isNoteQuotaExhausted = await page.evaluate((indicators) => {
          const bodyText = document.body.innerText;
          return indicators.some((ind) => bodyText.includes(ind));
        }, LI_SELECTORS.connector.noteLimitIndicators);

        if (customMessageTemplate && customMessageTemplate.trim() && addNoteBtn && !isNoteQuotaExhausted) {
          console.log('[LI Connector] Bấm Add a note để thêm lời chào cá nhân hóa...');
          try {
            await Humanize.clickElementNaturally(page, addNoteBtn);
          } catch {
            await addNoteBtn.click().catch(() => {});
          }

          await Humanize.randomDelay(800, 1500);

          const textArea = await page.waitForSelector(LI_SELECTORS.connector.modalTextArea, { timeout: 4000 }).catch(() => null);
          if (textArea) {
            await Humanize.clickElementNaturally(page, textArea).catch(async () => {
              await textArea.click();
            });
            await Humanize.randomDelay(300, 600);

            // Cá nhân hóa {name} và cắt tối đa 200 ký tự chuẩn LinkedIn
            let personalized = customMessageTemplate.replace(/{name}/gi, leadName || 'bạn');
            if (personalized.length > 200) {
              personalized = personalized.substring(0, 197) + '...';
            }

            await Humanize.typeSlowly(
              async (char) => {
                await page.keyboard.type(char);
              },
              async () => {
                await page.keyboard.press('Backspace');
              },
              personalized
            );

            await Humanize.randomDelay(1000, 2000);

            const sendBtn = await page.$(LI_SELECTORS.connector.modalSendButton);
            if (sendBtn) {
              try {
                await Humanize.clickElementNaturally(page, sendBtn);
              } catch {
                await sendBtn.click().catch(() => {});
              }
            }
          }
        } else {
          // Bấm "Send without a note" (hoặc Send trực tiếp)
          console.log('[LI Connector] Gửi lời mời kết nối không kèm ghi chú...');
          if (sendWithoutNoteBtn) {
            try {
              await Humanize.clickElementNaturally(page, sendWithoutNoteBtn);
            } catch {
              await sendWithoutNoteBtn.click().catch(() => {});
            }
          } else {
            const sendBtn = await page.$(LI_SELECTORS.connector.modalSendButton);
            if (sendBtn) {
              await Humanize.clickElementNaturally(page, sendBtn).catch(async () => {
                await sendBtn.click();
              });
            }
          }
        }
      }

      await Humanize.randomDelay(1500, 3000);
      return {
        success: true,
        message: 'Đã gửi lời mời kết nối thành công.',
      };
    } catch (err: any) {
      console.error('[LI Connector] Lỗi khi gửi kết nối trên thẻ:', err);
      return {
        success: false,
        message: err.message || 'Lỗi không xác định khi bấm kết nối.',
      };
    }
  }

  /**
   * Giữ tương thích ngược với luồng mở từng trang Profile (nếu cần)
   */
  async sendConnectionInvite(
    page: Page,
    profileUrl: string,
    customMessage?: string
  ): Promise<ConnectResult> {
    console.log(`[LI Connector] Đang mở hồ sơ: ${profileUrl}...`);

    try {
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await Humanize.randomDelay(2500, 4500);

      // 1. Tìm nút "Connect" trực tiếp trên trang cá nhân
      let connectBtn = null;
      for (const sel of LI_SELECTORS.connector.connectButtons) {
        connectBtn = await page.$(sel);
        if (connectBtn) {
          const isVisible = await connectBtn.isVisible();
          if (isVisible) break;
        }
      }

      // 2. Nếu không thấy nút Connect trực tiếp, thử tìm trong menu "More..." (Khác...)
      if (!connectBtn) {
        const moreBtn = await page.$(LI_SELECTORS.connector.moreActionsDropdown);
        if (moreBtn && (await moreBtn.isVisible())) {
          await Humanize.clickElementNaturally(page, moreBtn).catch(async () => {
            await moreBtn.click();
          });
          await Humanize.randomDelay(600, 1200);
          connectBtn = await page.$(LI_SELECTORS.connector.moreConnectOption);
        }
      }

      if (!connectBtn) {
        const isPending = await page.$('button:has-text("Pending")');
        if (isPending) {
          return { success: false, alreadyConnectedOrPending: true, message: 'Đã gửi lời mời trước đó (Pending).' };
        }
        return { success: false, message: 'Nút Connect không khả dụng cho hồ sơ này.' };
      }

      await Humanize.clickElementNaturally(page, connectBtn).catch(async () => {
        await connectBtn.click();
      });
      await Humanize.randomDelay(1500, 2500);

      const isLimitReached = await page.evaluate((indicators) => {
        const bodyText = document.body.innerText;
        return indicators.some((ind) => bodyText.includes(ind));
      }, LI_SELECTORS.connector.weeklyLimitIndicators);

      if (isLimitReached) {
        return {
          success: false,
          limitReached: true,
          message: 'Đã đạt giới hạn gửi lời mời kết nối trong tuần của LinkedIn!',
        };
      }

      if (customMessage) {
        const addNoteBtn = await page.$(LI_SELECTORS.connector.modalAddNoteButton);
        if (addNoteBtn && (await addNoteBtn.isVisible())) {
          await Humanize.clickElementNaturally(page, addNoteBtn).catch(async () => {
            await addNoteBtn.click();
          });
          await Humanize.randomDelay(800, 1500);

          const textArea = await page.waitForSelector(LI_SELECTORS.connector.modalTextArea, { timeout: 5000 }).catch(() => null);
          if (textArea) {
            await Humanize.clickElementNaturally(page, textArea).catch(async () => {
              await textArea.click();
            });
            await Humanize.randomDelay(300, 600);
            await Humanize.typeSlowly(
              async (char) => {
                await page.keyboard.type(char);
              },
              async () => {
                await page.keyboard.press('Backspace');
              },
              customMessage.substring(0, 200)
            );
            await Humanize.randomDelay(1000, 2000);
          }
        }
      }

      const sendBtn = await page.$(LI_SELECTORS.connector.modalSendButton);
      if (sendBtn) {
        await Humanize.clickElementNaturally(page, sendBtn).catch(async () => {
          await sendBtn.click();
        });
      }

      await Humanize.randomDelay(2000, 3500);
      return {
        success: true,
        message: 'Đã gửi lời mời kết nối thành công.',
      };
    } catch (err: any) {
      console.error('[LI Connector] Lỗi khi gửi kết nối:', err);
      return {
        success: false,
        message: err.message || 'Lỗi không xác định khi gửi lời mời.',
      };
    }
  }
}
