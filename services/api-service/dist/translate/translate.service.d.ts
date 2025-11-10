import { ConfigService } from '@nestjs/config';
import { CoordinatorClient } from './coordinator.client';
interface TranslationPayload {
    text: string;
    targetLanguage: string;
    mode?: 'translate' | 'post-process';
    context?: string;
}
export declare class TranslateService {
    private readonly coordinator;
    private readonly config;
    private readonly bucket;
    private readonly inputPrefix;
    private readonly outputPrefix;
    private readonly timeoutMs;
    constructor(coordinator: CoordinatorClient, config: ConfigService);
    translate(payload: TranslationPayload): Promise<{
        translatedText: string;
    }>;
    private prepareLines;
    private createJobId;
    private waitForCompletion;
}
export {};
