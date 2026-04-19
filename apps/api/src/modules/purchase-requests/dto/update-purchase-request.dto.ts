import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrPriority, PR_PRIORITIES } from '@prams/shared';
import { LineItemDto } from './create-purchase-request.dto';

export class UpdatePurchaseRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Office Renovation Phase 2' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ enum: PR_PRIORITIES })
  @IsEnum(PrPriority)
  @IsOptional()
  priority?: PrPriority;

  @ApiPropertyOptional({ type: [LineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  @IsOptional()
  items?: LineItemDto[];

  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  neededByDate?: string;
}
