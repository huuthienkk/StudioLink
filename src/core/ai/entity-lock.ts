export interface LockedEntities {
  phones: string[];
  prices: string[];
  links: string[];
}

export interface EntityValidationResult {
  isValid: boolean;
  missingPhones: string[];
  missingPrices: string[];
  missingLinks: string[];
}

/**
 * Tách và kiểm tra SĐT, giá tiền, link liên kết.
 * Đảm bảo các biến thể do AI sinh ra không bao giờ làm sai lệch thông tin liên hệ hoặc báo giá của chủ shop.
 */
export class EntityLock {
  /**
   * Trích xuất các thực thể nhạy cảm từ văn bản gốc
   */
  static extractEntities(text: string): LockedEntities {
    // Nhận diện SĐT Việt Nam (đầu 03, 05, 07, 08, 09 hoặc +84)
    const phoneRegex = /(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}\b/g;

    // Nhận diện giá tiền: 200k, 200.000đ, 200,000 VND, 50$, 50 USD
    const priceRegex = /(?:\$\s?\d{1,3}(?:[.,]\d{3})*|\b\d{1,3}(?:[.,]\d{3})*\s?(?:VND|vnđ|đ|k|USD|\$))\b/gi;

    // Nhận diện liên kết: https://... hoặc http://...
    const linkRegex = /(https?:\/\/[^\s]+)/gi;

    const phones = Array.from(new Set(text.match(phoneRegex) || []));
    const prices = Array.from(new Set(text.match(priceRegex) || []));
    const links = Array.from(new Set(text.match(linkRegex) || []));

    return { phones, prices, links };
  }

  /**
   * Kiểm tra chi tiết và trả về danh sách các thực thể bị thiếu (nếu có)
   */
  static validate(originalText: string, variantText: string): EntityValidationResult {
    const original = this.extractEntities(originalText);

    const missingPhones = original.phones.filter(phone => !variantText.includes(phone));
    const missingPrices = original.prices.filter(price => !variantText.includes(price));
    const missingLinks = original.links.filter(link => !variantText.includes(link));

    const isValid = missingPhones.length === 0 && missingPrices.length === 0 && missingLinks.length === 0;

    return {
      isValid,
      missingPhones,
      missingPrices,
      missingLinks,
    };
  }

  /**
   * Kiểm tra nhanh đúng/sai cho điều kiện guard
   */
  static validateLockedEntities(originalText: string, variantText: string): boolean {
    return this.validate(originalText, variantText).isValid;
  }
}
