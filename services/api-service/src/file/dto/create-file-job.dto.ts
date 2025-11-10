import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateFileJobDto {
  @IsString()
  key!: string;

  @IsString()
  sourcePath!: string;

  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsIn(['create', 'update'])
  operation?: 'create' | 'update';
}
