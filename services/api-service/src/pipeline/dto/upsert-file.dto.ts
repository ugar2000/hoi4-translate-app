import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertFileDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsInt()
  totalLines!: number;

  @IsInt()
  totalChunks!: number;

  @IsString()
  @IsNotEmpty()
  originLang!: string;

  @IsString()
  @IsNotEmpty()
  targetLang!: string;
}
