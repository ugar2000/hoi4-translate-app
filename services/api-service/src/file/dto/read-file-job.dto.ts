import { IsOptional, IsString } from 'class-validator';

export class ReadFileJobDto {
  @IsString()
  key!: string;

  @IsString()
  destinationPath!: string;

  @IsOptional()
  @IsString()
  bucket?: string;
}
