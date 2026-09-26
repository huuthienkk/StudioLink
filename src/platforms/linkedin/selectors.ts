/**
 * ★ Toàn bộ Selector DOM của LinkedIn tập trung duy nhất tại file này.
 */
export const LI_SELECTORS = {
  login: {
    url: 'https://www.linkedin.com/login',
    usernameInput: 'input#username, input[name="session_key"]',
    passwordInput: 'input#password, input[name="session_password"]',
    submitButton: 'button[type="submit"]',
    feedIndicator: 'div.feed-identity-module, nav.global-nav, input.search-global-typeahead__input',
    checkpointForm: '#checkpointChallengeForm, #captcha-internal, div.challenge-dialog',
  },
  nav: {
    feedUrl: 'https://www.linkedin.com/feed/',
    globalSearchInput: 'input.search-global-typeahead__input, input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]',
  },
  filters: {
    peopleCategoryButtons: [
      'button:has-text("Người")',
      'button:has-text("People")',
      'a:has-text("Người")',
      'a:has-text("People")',
    ],
    locationFilterButtons: [
      'button:has-text("Vị trí")',
      'button:has-text("Locations")',
      'button[aria-label*="Vị trí"]',
      'button[aria-label*="Locations"]',
    ],
    locationSearchInputs: [
      'input[placeholder*="Thêm vị trí"]',
      'input[placeholder*="Add a location"]',
      'input[aria-label*="Thêm vị trí"]',
      'input[aria-label*="Add a location"]',
    ],
    locationFirstSuggestion: 'div.basic-typeahead__selectable-list li, div[role="listbox"] li, div.search-basic-typeahead__suggestion, fieldset input[type="checkbox"]',
    locationApplyButtons: [
      'button:has-text("Hiển thị kết quả")',
      'button:has-text("Show results")',
      'button[data-control-name="filter_show_results"]',
    ],
  },
  search: {
    peopleUrl: (keyword: string, locationUrn?: string, secondDegreeOnly?: boolean) => {
      let url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}&origin=GLOBAL_SEARCH_HEADER`;
      if (locationUrn) {
        url += `&geoUrn=${encodeURIComponent(locationUrn)}`;
      }
      if (secondDegreeOnly) {
        url += `&network=%5B"S"%5D`;
      }
      return url;
    },
    resultCards: 'li.reusable-search__result-container, div.search-results-container li',
    profileLink: 'span.entity-result__title-text a.app-aware-link',
    nameSpan: 'span.entity-result__title-text a span[aria-hidden="true"]',
    headlineSpan: 'div.entity-result__primary-subtitle',
    locationSpan: 'div.entity-result__secondary-subtitle',
    paginationNextButton: 'button[aria-label="Next"], button:has-text("Next"), button.artdeco-pagination__button--next, button:has-text("Tiếp")',
  },
  connector: {
    // Nút Connect trên thẻ kết quả hoặc trên trang Profile
    connectButtons: [
      'button:has-text("Connect")',
      'button:has-text("Kết nối")',
      'button[aria-label*="Invite"]:has-text("Connect")',
      'button[aria-label*="kết nối"]',
      'button.artdeco-button--primary:has-text("Connect")',
    ],
    moreActionsDropdown: 'button[aria-label="More actions"], button:has-text("More")',
    moreConnectOption: 'div.artdeco-dropdown__content div[role="button"]:has-text("Connect")',
    
    // Modal sau khi bấm Connect
    modalAddNoteButton: 'button[aria-label="Add a note"], button:has-text("Add a note"), button:has-text("Thêm ghi chú")',
    modalSendWithoutNoteButton: 'button[aria-label="Send without a note"], button:has-text("Send without a note"), button:has-text("Gửi không có ghi chú")',
    modalTextArea: 'textarea#custom-message, textarea[name="message"]',
    modalSendButton: 'button[aria-label="Send now"], button:has-text("Send"), button:has-text("Gửi")',

    weeklyLimitIndicators: [
      "You've reached the weekly invitation limit",
      "Bạn đã đạt giới hạn lời mời trong tuần",
      "reached the weekly invitation limit",
    ],
    noteLimitIndicators: [
      '0 personalized invitations remaining',
      '0 lời mời cá nhân hóa còn lại',
      'personalized invitations remaining for this month',
    ],
  },
};
