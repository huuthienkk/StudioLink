import { EntityLock } from './entity-lock';

export interface VariantPromptOptions {
  baseContent: string;
  count?: number;
  tone?: 'professional' | 'friendly' | 'urgent' | 'storytelling';
  provider?: 'openai' | 'gemini';
  apiKey?: string;
}

/**
 * Bộ sinh biến thể nội dung từ mẫu gốc bằng LLM kết hợp Entity-Lock
 */
export class VariantGenerator {
  private defaultApiKey: string;
  private defaultProvider: 'openai' | 'gemini';

  constructor(apiKey?: string, provider?: 'openai' | 'gemini') {
    this.defaultApiKey = apiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '';
    this.defaultProvider = provider || (process.env.AI_PROVIDER as 'openai' | 'gemini') || 'openai';
  }

  /**
   * Sinh các biến thể nội dung kèm cơ chế kiểm duyệt và thử lại (Entity-Lock Guard)
   */
  async generateVariants(options: VariantPromptOptions): Promise<string[]> {
    const count = options.count || 5;
    const tone = options.tone || 'friendly';
    const originalEntities = EntityLock.extractEntities(options.baseContent);

    const lockedSummary = [
      originalEntities.phones.length ? `SĐT: ${originalEntities.phones.join(', ')}` : '',
      originalEntities.prices.length ? `Giá: ${originalEntities.prices.join(', ')}` : '',
      originalEntities.links.length ? `Link: ${originalEntities.links.join(', ')}` : '',
    ].filter(Boolean).join(' | ');

    const systemPrompt = `Bạn là trợ lý viết bài tiếp thị mạng xã hội.
Hãy viết lại bài viết sau thành ${count} biến thể khác nhau với phong cách "${tone}".
LƯU Ý QUAN TRỌNG NHẤT (BẮT BUỘC):
Bạn phải giữ NGUYÊN VẸN 100% các thực thể sau đây trong TẤT CẢ các biến thể, KHÔNG ĐƯỢC THAY ĐỔI, KHÔNG ĐƯỢC LÀM MẤT:
${lockedSummary || 'Không có thực thể đặc biệt'}.
Mỗi biến thể ngăn cách nhau bởi dòng: ---VARIANT_SEPARATOR---`;

    const apiKey = options.apiKey || this.defaultApiKey;

    // Nếu không có API Key, sử dụng bộ sinh biến thể offline/mẫu
    if (!apiKey) {
      console.warn('[AI] Chưa cấu hình API Key, tạo biến thể bằng mẫu nội suy.');
      return this.generateFallbackVariants(options.baseContent, count, originalEntities);
    }

    try {
      let rawVariants: string[] = [];
      if (options.provider === 'gemini' || this.defaultProvider === 'gemini') {
        rawVariants = await this.callGemini(apiKey, systemPrompt, options.baseContent);
      } else {
        rawVariants = await this.callOpenAI(apiKey, systemPrompt, options.baseContent);
      }

      // Kiểm duyệt bằng EntityLock
      const validVariants: string[] = [];
      for (const variant of rawVariants) {
        if (EntityLock.validateLockedEntities(options.baseContent, variant)) {
          validVariants.push(variant.trim());
        } else {
          console.warn('[AI Entity-Lock] Biến thể bị loại bỏ do thiếu thông tin quan trọng.');
        }
      }

      // Nếu số bản hợp lệ ít hơn mong muốn, bù thêm bằng fallback để đảm bảo luôn đủ số lượng
      while (validVariants.length < count) {
        validVariants.push(this.createFallbackVariant(options.baseContent, validVariants.length + 1));
      }

      return validVariants.slice(0, count);
    } catch (error) {
      console.error('[AI] Lỗi khi gọi API AI, chuyển sang chế độ dự phòng:', error);
      return this.generateFallbackVariants(options.baseContent, count, originalEntities);
    }
  }

  private async callOpenAI(apiKey: string, systemPrompt: string, content: string): Promise<string[]> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        temperature: 0.7,
      }),
    });

    const data = await res.json() as any;
    const text = data?.choices?.[0]?.message?.content || '';
    return text.split('---VARIANT_SEPARATOR---').map((s: string) => s.trim()).filter(Boolean);
  }

  private async callGemini(apiKey: string, systemPrompt: string, content: string): Promise<string[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nNội dung cần viết lại:\n${content}` }] }
        ],
      }),
    });

    const data = await res.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.split('---VARIANT_SEPARATOR---').map((s: string) => s.trim()).filter(Boolean);
  }

  private generateFallbackVariants(baseContent: string, count: number, _entities: any): string[] {
    const prefixes = [
      '🔥 [ƯU ĐÃI ĐẶC BIỆT] ',
      '📢 [THÔNG BÁO QUAN TRỌNG] ',
      '💡 [BẠN ĐÃ BIẾT CHƯA] ',
      '✨ [SIÊU PHẨM MỚI] ',
      '🚀 [CƠ HỘI DUY NHẤT HÔM NAY] ',
      '⭐ [KHUYẾN MÃI CỰC KHỦNG] ',
    ];

    return Array.from({ length: count }, (_, i) => {
      const prefix = prefixes[i % prefixes.length];
      return `${prefix}${baseContent}`;
    });
  }

  private createFallbackVariant(baseContent: string, index: number): string {
    return `[Biến thể #${index}] ${baseContent}`;
  }
}
