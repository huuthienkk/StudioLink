import { Page } from 'playwright-core';
import { LI_SELECTORS } from './selectors';
import { Humanize } from '../../core/browser/humanize';

export interface LinkedInProfileLead {
  name: string;
  headline?: string;
  profileUrl: string;
  location?: string;
}

export class LinkedInPeopleSearch {
  /**
   * Điều hướng và áp dụng bộ lọc hoàn toàn qua giao diện người dùng thực tế:
   * 1. Vào Feed -> 2. Gõ từ khóa vào thanh tìm kiếm -> 3. Nhấn Enter ->
   * 4. Bấm tab bộ lọc "Người" (People) -> 5. Mở bộ lọc "Vị trí", nhập địa điểm và áp dụng.
   */
  async navigateToPeopleSearchWithLocation(
    page: Page,
    keyword: string,
    location?: string,
    secondDegreeOnly: boolean = true
  ): Promise<boolean> {
    console.log(`[LI Search] Bắt đầu luồng tìm kiếm UI: "${keyword}", Vị trí: "${location || 'Mặc định'}", Cấp 2: ${secondDegreeOnly}`);

    try {
      // 1. Nếu chưa ở trang feed hoặc search, điều hướng đến feed
      const currentUrl = page.url();
      if (!currentUrl.includes('/feed') && !currentUrl.includes('/search/results')) {
        await page.goto(LI_SELECTORS.nav.feedUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await Humanize.randomDelay(2000, 3500);
      }

      // 2. Tìm và kích hoạt ô tìm kiếm chính
      const searchInput = await page.$(LI_SELECTORS.nav.globalSearchInput);
      if (!searchInput) {
        console.warn('[LI Search] Không tìm thấy ô tìm kiếm header, thử điều hướng trực tiếp URL.');
        await page.goto(LI_SELECTORS.search.peopleUrl(keyword, undefined, secondDegreeOnly), { waitUntil: 'domcontentloaded', timeout: 35000 });
        await Humanize.randomDelay(2500, 4000);
      } else {
        await searchInput.click();
        await Humanize.randomDelay(400, 800);

        // Xóa text cũ nếu có và gõ từ khóa mới
        await page.keyboard.press('Control+A').catch(() => {});
        await page.keyboard.press('Backspace').catch(() => {});
        await Humanize.randomDelay(200, 400);

        await Humanize.typeSlowly(
          async (char) => {
            await page.keyboard.type(char);
          },
          async () => {
            await page.keyboard.press('Backspace');
          },
          keyword
        );

        await Humanize.randomDelay(600, 1200);

        // 3. Nhấn Enter để thực hiện tìm kiếm chung
        console.log('[LI Search] Nhấn Enter để tìm kiếm...');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await Humanize.randomDelay(2500, 4000);

        // 4. Tìm và click tab bộ lọc "Người" / "People" (quét theo text linh hoạt)
        let clickedPeopleTab = false;
        for (const selector of LI_SELECTORS.filters.peopleCategoryButtons) {
          const tabBtn = await page.$(selector);
          if (tabBtn && (await tabBtn.isVisible().catch(() => false))) {
            console.log('[LI Search] Đã tìm thấy tab bộ lọc "Người", đang click...');
            try {
              await tabBtn.click({ timeout: 5000 });
            } catch {
              await tabBtn.evaluate((el: any) => el.click()).catch(() => {});
            }
            clickedPeopleTab = true;
            break;
          }
        }

        if (!clickedPeopleTab && !page.url().includes('/search/results/people/')) {
          console.log('[LI Search] Không tìm thấy tab Người trên thanh filter, chuyển hướng URL người.');
          const networkQuery = secondDegreeOnly ? '&network=%5B"S"%5D' : '';
          await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}&origin=SWITCH_SEARCH_VERTICAL${networkQuery}`, {
            waitUntil: 'domcontentloaded',
            timeout: 35000,
          });
        }

        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await Humanize.randomDelay(2500, 4000);
      }

      // 5. Nếu có yêu cầu vị trí địa lý, áp dụng bộ lọc Vị trí qua UI
      if (location && location.trim()) {
        console.log(`[LI Search] Đang áp dụng bộ lọc Vị trí: "${location}" qua giao diện...`);
        let locationBtn = null;
        for (const sel of LI_SELECTORS.filters.locationFilterButtons) {
          locationBtn = await page.$(sel);
          if (locationBtn && (await locationBtn.isVisible().catch(() => false))) {
            break;
          }
        }

        if (locationBtn) {
          try {
            await locationBtn.click({ timeout: 5000 });
          } catch {
            await locationBtn.evaluate((el: any) => el.click()).catch(() => {});
          }
          await Humanize.randomDelay(1000, 2000);

          // Tìm ô input nhập vị trí
          let locInput = null;
          for (const inputSel of LI_SELECTORS.filters.locationSearchInputs) {
            locInput = await page.$(inputSel);
            if (locInput && (await locInput.isVisible().catch(() => false))) {
              break;
            }
          }

          if (locInput) {
            await locInput.click();
            await Humanize.randomDelay(300, 600);
            await page.keyboard.type(location, { delay: 60 });
            await Humanize.randomDelay(1200, 2500);

            // Chọn gợi ý đầu tiên trong danh sách popover
            const firstSuggestion = await page.$(LI_SELECTORS.filters.locationFirstSuggestion);
            if (firstSuggestion) {
              await firstSuggestion.click().catch(() => {});
              await Humanize.randomDelay(600, 1200);
            } else {
              // Fallback nhấn phím xuống và Enter
              await page.keyboard.press('ArrowDown').catch(() => {});
              await page.keyboard.press('Enter').catch(() => {});
              await Humanize.randomDelay(600, 1200);
            }

            // Click nút "Hiển thị kết quả" / "Show results"
            for (const applySel of LI_SELECTORS.filters.locationApplyButtons) {
              const applyBtn = await page.$(applySel);
              if (applyBtn && (await applyBtn.isVisible().catch(() => false))) {
                console.log('[LI Search] Bấm nút Hiển thị kết quả lọc...');
                try {
                  await applyBtn.click({ timeout: 5000 });
                } catch {
                  await applyBtn.evaluate((el: any) => el.click()).catch(() => {});
                }
                break;
              }
            }

            await page.waitForLoadState('domcontentloaded').catch(() => {});
            await Humanize.randomDelay(2500, 4500);
          }
        } else {
          console.warn('[LI Search] Không tìm thấy nút bộ lọc Vị trí trên giao diện, tiếp tục danh sách mặc định.');
        }
      }

      // 6. Áp dụng bộ lọc Kết nối cấp 2 (2nd-degree) nếu chưa có trong URL
      if (secondDegreeOnly) {
        const curUrl = page.url();
        if (curUrl.includes('/search/results/people') && !curUrl.includes('network=')) {
          console.log('[LI Search] Áp dụng bộ lọc Mạng lưới Cấp 2 (2nd-degree connections)...');
          const delimiter = curUrl.includes('?') ? '&' : '?';
          await page.goto(`${curUrl}${delimiter}network=%5B"S"%5D`, {
            waitUntil: 'domcontentloaded',
            timeout: 35000,
          });
          await page.waitForLoadState('domcontentloaded').catch(() => {});
          await Humanize.randomDelay(2500, 4500);
        }
      }

      console.log('[LI Search] Đã vào trang danh sách kết quả nhân sự thành công.');
      return true;
    } catch (err) {
      console.error('[LI Search] Lỗi trong quá trình điều hướng tìm kiếm UI:', err);
      return false;
    }
  }

  /**
   * Quét danh sách nhân sự tiềm năng (giữ tương thích ngược cho unit test)
   */
  async searchLeads(
    page: Page,
    keyword: string,
    locationUrn?: string,
    pagination: { start: number; end: number } = { start: 1, end: 2 }
  ): Promise<LinkedInProfileLead[]> {
    console.log(`[LI Search] Quét nhân sự: "${keyword}", Trang: ${pagination.start} -> ${pagination.end}...`);
    
    const leadsMap = new Map<string, LinkedInProfileLead>();

    for (let pageNum = pagination.start; pageNum <= pagination.end; pageNum++) {
      let pageUrl = LI_SELECTORS.search.peopleUrl(keyword, locationUrn);
      if (pageNum > 1) {
        pageUrl += `&page=${pageNum}`;
      }

      console.log(`[LI Search] Đang tải trang kết quả #${pageNum}...`);
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await Humanize.randomDelay(2500, 4500);

      // Cuộn trang mượt để tải hết các thẻ profile lazy-load
      await Humanize.smoothScroll(
        async (step) => {
          await page.evaluate((y) => window.scrollBy(0, y), step);
        },
        1200
      );
      await Humanize.randomDelay(1500, 2500);

      // Trích xuất các thẻ ứng viên/nhân sự
      const extractedLeads = await page.evaluate(() => {
        const results: { name: string; headline: string; profileUrl: string; location: string }[] = [];
        const cards = document.querySelectorAll('li.reusable-search__result-container');

        cards.forEach((card) => {
          const linkEl = card.querySelector<HTMLAnchorElement>('span.entity-result__title-text a.app-aware-link');
          const nameEl = linkEl?.querySelector('span[aria-hidden="true"]');
          const headlineEl = card.querySelector('div.entity-result__primary-subtitle');
          const locationEl = card.querySelector('div.entity-result__secondary-subtitle');

          if (linkEl && nameEl) {
            const rawUrl = linkEl.href.split('?')[0];
            results.push({
              name: nameEl.textContent?.trim() || '',
              headline: headlineEl?.textContent?.trim() || '',
              profileUrl: rawUrl,
              location: locationEl?.textContent?.trim() || '',
            });
          }
        });

        return results;
      });

      for (const lead of extractedLeads) {
        if (!leadsMap.has(lead.profileUrl) && lead.name && !lead.name.includes('LinkedIn Member')) {
          leadsMap.set(lead.profileUrl, lead);
        }
      }

      console.log(`[LI Search] Đã quét được ${leadsMap.size} nhân sự tiềm năng.`);
      await Humanize.randomDelay(2000, 3500);
    }

    return Array.from(leadsMap.values());
  }
}
