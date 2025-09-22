import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TranslationService } from './translation.service';

interface TranslationPayload {
  text: string;
  targetLanguage: string;
  mode?: 'translate' | 'post-process';
  context?: string;
}

@Controller()
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @MessagePattern('translate-text')
  handleTranslate(@Payload() payload: TranslationPayload) {
    return this.translationService.translate(
      payload.text,
      payload.targetLanguage,
      payload.mode,
      payload.context,
    );
  }
}
