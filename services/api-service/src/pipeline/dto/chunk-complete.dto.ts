import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChunkLineDto {
  @IsInt()
  line_no!: number;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  original?: string;
}

export class ChunkCompleteDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsInt()
  chunkSeq!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChunkLineDto)
  lines!: ChunkLineDto[];
}
