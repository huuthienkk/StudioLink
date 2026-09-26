import { Page } from 'playwright-core';
import { PlatformSession } from '../platform.types';
import { LI_SELECTORS } from './selectors';
import { Humanize } from '../../core/browser/humanize';

export class LinkedInAuth {
  /**
   * Đăng nhập và kiểm tra phiên làm việc LinkedIn
   */
  async login(page: Page, credentials: { username: string; password?: string }): Promise<boolean> {
    console.log(`[LI Auth] Bắt đầu xác thực tài khoản LinkedIn: ${credentials.username}`);

    await page.goto(LI_SELECTORS.login.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await Humanize.randomDelay(1500, 3000);

    const session = await this.checkSession(page);
    if (session.isLoggedIn) {
      console.log(`[LI Auth] Tài khoản ${credentials.username} đã có phiên đăng nhập hợp lệ.`);
      return true;
    }

    if (!credentials.password) {
      console.warn(`[LI Auth] Không có mật khẩu để thực hiện đăng nhập mới cho ${credentials.username}.`);
      return false;
    }

    // Nhập Email / Phone
    const userInput = await page.waitForSelector(LI_SELECTORS.login.usernameInput, { timeout: 10000 }).catch(() => null);
    if (!userInput) {
      console.error('[LI Auth] Không tìm thấy ô nhập email/username LinkedIn.');
      return false;
    }

    await userInput.click();
    await Humanize.randomDelay(300, 600);
    await page.keyboard.type(credentials.username, { delay: Math.floor(Math.random() * 50) + 50 });

    // Nhập Password
    const passInput = await page.$(LI_SELECTORS.login.passwordInput);
    if (passInput) {
      await passInput.click();
      await Humanize.randomDelay(300, 600);
      await page.keyboard.type(credentials.password, { delay: Math.floor(Math.random() * 50) + 50 });
    }

    // Bấm Đăng nhập
    await Humanize.randomDelay(600, 1200);
    const submitBtn = await page.$(LI_SELECTORS.login.submitButton);
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await Humanize.randomDelay(3000, 6000);

    const postSession = await this.checkSession(page);
    return postSession.isLoggedIn && !postSession.checkpointDetected;
  }

  /**
   * Kiểm tra xem phiên làm việc có hợp lệ hay bị yêu cầu mã xác minh (Challenge/Checkpoint)
   */
  async checkSession(page: Page): Promise<PlatformSession> {
    const currentUrl = page.url();

    // Kiểm tra challenge / checkpoint
    if (currentUrl.includes('/checkpoint/') || currentUrl.includes('/challenge/')) {
      console.warn('[LI Auth] Phát hiện thử thách bảo mật (Checkpoint/Captcha) tại URL:', currentUrl);
      return { isLoggedIn: false, checkpointDetected: true };
    }

    const isChallenge = await page.$(LI_SELECTORS.login.checkpointForm).then(el => !!el).catch(() => false);
    if (isChallenge) {
      console.warn('[LI Auth] Phát hiện form thử thách bảo mật DOM trên LinkedIn.');
      return { isLoggedIn: false, checkpointDetected: true };
    }

    // Kiểm tra đã vào bảng tin LinkedIn
    const isFeed = await page.$(LI_SELECTORS.login.feedIndicator).then(el => !!el).catch(() => false);
    if (isFeed || currentUrl.includes('/feed')) {
      const cookies = await page.context().cookies();
      return {
        isLoggedIn: true,
        checkpointDetected: false,
        cookies,
      };
    }

    return { isLoggedIn: false, checkpointDetected: false };
  }
}
