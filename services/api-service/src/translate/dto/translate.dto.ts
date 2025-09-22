import { IsIn, IsOptional, IsString } from 'class-validator';

export class TranslateDto {
  @IsString()
  text!: string;

  @IsString()
  targetLanguage!: string;

  @IsOptional()
  @IsIn(['translate', 'post-process'])
  mode?: 'translate' | 'post-process';

  @IsOptional()
  @IsString()
  context?: string;
}
