import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async translate(text: string, targetLanguage: string, mode: 'translate' | 'post-process' = 'translate', context = '') {
    if (!text || !targetLanguage) {
      throw new Error('Missing text or target language');
    }

    const systemPrompt = mode === 'post-process'
      ? `You are a professional game translator and editor. Review and improve this ${targetLanguage} translation:\n1. Ensure gaming terminology is consistent\n2. Maintain the tone and style appropriate for games\n3. Preserve all special characters and formatting\n4. Only respond with the improved translation, nothing else\n${context}`
      : `You are a professional translator specializing in game content. Translate this text to ${targetLanguage}:\n1. Maintain natural language flow\n2. Keep gaming terminology consistent\n3. Preserve all special characters and formatting\n4. Only respond with the translation, nothing else`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      top_p: 1,
    });

    const translatedText = completion.choices[0]?.message?.content ?? text;
    this.logger.debug(`Translated text for target ${targetLanguage}`);

    return { translatedText };
  }
}
