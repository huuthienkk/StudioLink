import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LI_SELECTORS } from '../../src/platforms/linkedin/selectors';
import { LinkedInPeopleSearch } from '../../src/platforms/linkedin/people-search';

describe('LinkedIn Automation E2E Validation', () => {
  it('phải có đầy đủ các selector quan trọng của LinkedIn', () => {
    assert.ok(LI_SELECTORS.login.usernameInput);
    assert.ok(LI_SELECTORS.login.passwordInput);
    assert.ok(LI_SELECTORS.login.submitButton);
    assert.ok(LI_SELECTORS.connector.connectButtons.length > 0);
    assert.ok(LI_SELECTORS.connector.modalAddNoteButton);
    assert.ok(LI_SELECTORS.connector.modalSendButton);
  });

  it('phải sinh đúng định dạng URL tìm kiếm nhân sự LinkedIn', () => {
    const url = LI_SELECTORS.search.peopleUrl('Marketing', '106201408');
    assert.equal(
      url,
      'https://www.linkedin.com/search/results/people/?keywords=Marketing&origin=GLOBAL_SEARCH_HEADER&geoUrn=106201408'
    );
  });

  it('phải sinh đúng định dạng URL tìm kiếm nhân sự LinkedIn kèm bộ lọc cấp 2', () => {
    const url = LI_SELECTORS.search.peopleUrl('Marketing', '106201408', true);
    assert.equal(
      url,
      'https://www.linkedin.com/search/results/people/?keywords=Marketing&origin=GLOBAL_SEARCH_HEADER&geoUrn=106201408&network=%5B"S"%5D'
    );
  });

  it('khởi tạo được LinkedInPeopleSearch và LinkedInInviteCleaner', async () => {
    const search = new LinkedInPeopleSearch();
    assert.ok(search);
    const { LinkedInInviteCleaner } = await import('../../src/platforms/linkedin/withdraw');
    const cleaner = new LinkedInInviteCleaner();
    assert.ok(cleaner);
    const { OrganicActions } = await import('../../src/platforms/linkedin/organic');
    assert.ok(OrganicActions.simulateProfileReading);
    assert.ok(OrganicActions.wanderFeed);
  });
});
