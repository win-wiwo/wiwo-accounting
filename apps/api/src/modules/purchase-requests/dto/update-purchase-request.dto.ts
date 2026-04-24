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
  IsMongoId,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrPriority, PR_PRIORITIES } from '@prams/shared';
import { LineItemDto } from './create-purchase-request.dto';

export class UpdatePurchaseRequestDto {
  @ApiPropertyOptional({ example: 'Busway Phase 2 Pole Hardware' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  projectId?: string;

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

  @ApiPropertyOptional({ description: 'Requester note explaining what changed on resubmission' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  resubmissionNote?: string;
}
