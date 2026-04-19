import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  IsDateString,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrPriority, PR_PRIORITIES } from '@prams/shared';

export class LineItemDto {
  @ApiProperty({ example: 'Office chair (ergonomic)' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'pcs' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit: string;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(0)
  estimatedPrice: number;

  @ApiPropertyOptional({ example: 'With lumbar support' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseRequestDto {
  @ApiPropertyOptional({ enum: ['purchase_request', 'job_request'], default: 'purchase_request' })
  @IsIn(['purchase_request', 'job_request'])
  @IsOptional()
  requestType?: string;

  @ApiProperty({ example: 'Office Furniture for New Hires' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Need to furnish workstations for 5 new engineers joining next month.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: 'Office Renovation Phase 2' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  projectName?: string;

  @ApiProperty({ enum: PR_PRIORITIES, example: 'medium' })
  @IsEnum(PrPriority)
  priority: PrPriority;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items: LineItemDto[];

  @ApiProperty({ example: 'Team expansion requires additional equipment.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  justification: string;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  neededByDate?: string;
}
