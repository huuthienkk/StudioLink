/**
 * Giới hạn an toàn mặc định để tránh checkpoint và hạn chế tài khoản
 */
export const SAFETY_LIMITS = {
  FACEBOOK: {
    MAX_POSTS_PER_DAY: 15,
    MAX_POSTS_PER_HOUR: 3,
    MIN_DELAY_BETWEEN_POSTS_SEC: 180, // 3 phút
    MAX_DELAY_BETWEEN_POSTS_SEC: 600, // 10 phút
  },
  LINKEDIN: {
    MAX_INVITES_PER_WEEK: 100,
    MAX_INVITES_PER_DAY: 20,
    MIN_DELAY_BETWEEN_INVITES_SEC: 120, // 2 phút
    MAX_DELAY_BETWEEN_INVITES_SEC: 360, // 6 phút
  },
};

export const PROXY_PROTOCOLS = ['http', 'https', 'socks4', 'socks5'] as const;
