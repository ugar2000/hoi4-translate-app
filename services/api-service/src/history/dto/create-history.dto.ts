import { IsNotEmpty, IsString } from 'class-validator';

export class CreateHistoryDto {
  @IsString()
  @IsNotEmpty()
  originLang!: string;

  @IsString()
  @IsNotEmpty()
  translatedLang!: string;
}
