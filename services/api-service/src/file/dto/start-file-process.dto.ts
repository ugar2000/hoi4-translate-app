import { IsNotEmpty, IsString } from 'class-validator';

export class StartFileProcessDto {
  @IsString()
  @IsNotEmpty()
  targetLang!: string;
}
