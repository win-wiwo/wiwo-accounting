import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrNumberConfigDto {
  @ApiPropertyOptional({ example: 'PR' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @IsOptional()
  prefix?: string;

  @ApiPropertyOptional({ example: '-', enum: ['-', '/', '_'] })
  @IsString()
  @IsIn(['-', '/', '_'])
  @IsOptional()
  separator?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  includeYear?: boolean;

  @ApiPropertyOptional({ example: 'full', enum: ['full', 'short'] })
  @IsString()
  @IsIn(['full', 'short'])
  @IsOptional()
  yearFormat?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  includeDepartmentCode?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsInt()
  @Min(3)
  @Max(8)
  @IsOptional()
  sequenceDigits?: number;
}
