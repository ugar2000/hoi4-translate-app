import { IsNotEmpty, IsString } from 'class-validator';

export class MarkFileErrorDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsString()
  @IsNotEmpty()
  error!: string;
}
