import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface TranslationPayload {
  text: string;
  targetLanguage: string;
  mode?: 'translate' | 'post-process';
  context?: string;
}

@Injectable()
export class TranslateService {
  constructor(@Inject('TRANSLATION_CLIENT') private readonly client: ClientProxy) {}

  async translate(payload: TranslationPayload) {
    try {
      const result = await firstValueFrom(this.client.send('translate-text', payload));
      return result ?? { translatedText: payload.text };
    } catch (error) {
      throw new InternalServerErrorException('Translation failed');
    }
  }
}
