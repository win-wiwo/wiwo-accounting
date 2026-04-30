import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrNumberConfigDto {
  @ApiPropertyOptional({ example: '-', enum: ['-', '/', '_'] })
  @IsString()
  @IsIn(['-', '/', '_'])
  @IsOptional()
  separator?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsInt()
  @Min(3)
  @Max(8)
  @IsOptional()
  sequenceDigits?: number;
}
