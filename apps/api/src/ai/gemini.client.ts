// ============================================================
// Path: apps/api/src/ai/gemini.client.ts
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string; code: number };
}

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
  }

  get isConfigured(): boolean {
    return (
      !!this.apiKey &&
      !this.apiKey.includes('placeholder') &&
      this.apiKey.length > 20
    );
  }

  async generate(prompt: string, systemInstruction?: string): Promise<string | null> {
    if (!this.isConfigured) {
      this.logger.warn('⚠️  Gemini not configured — skipping API call');
      return null;
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as GeminiResponse;

      if (!res.ok || data.error) {
        this.logger.error(
          `Gemini API error: ${data.error?.message ?? res.statusText}`,
        );
        return null;
      }

      const text =
        data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

      return text.trim() || null;
    } catch (err) {
      this.logger.error(`Gemini fetch failed: ${(err as Error).message}`);
      return null;
    }
  }
}