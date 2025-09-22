import { Body, Controller, Post } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateDto } from './dto/translate.dto';

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  translate(@Body() dto: TranslateDto) {
    return this.translateService.translate({
      text: dto.text,
      targetLanguage: dto.targetLanguage,
      mode: dto.mode,
      context: dto.context,
    });
  }
}
