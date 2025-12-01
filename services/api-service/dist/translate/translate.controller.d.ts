import { TranslateService } from './translate.service';
import { TranslateDto } from './dto/translate.dto';
export declare class TranslateController {
    private readonly translateService;
    constructor(translateService: TranslateService);
    translate(dto: TranslateDto): Promise<{
        translatedText: string;
    }>;
}
