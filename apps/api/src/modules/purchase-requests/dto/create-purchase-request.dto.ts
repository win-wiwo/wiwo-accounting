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
  ArrayMaxSize,
  IsIn,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrPriority, PR_PRIORITIES, SourcingType } from '@prams/shared';

export class SellerReferenceDto {
  @ApiProperty({ example: 'Lazada - TechSupplies PH' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sellerName: string;

  @ApiPropertyOptional({ example: 'https://lazada.com.ph/product/...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url?: string;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'Free shipping, 1 year warranty' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class LineItemDto {
  @ApiProperty({ example: 'Ergonomic office chair' })
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

  @ApiPropertyOptional({ example: 'Mesh back, lumbar support, adjustable height, 120kg capacity' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  specifications?: string;

  @ApiProperty({ enum: Object.values(SourcingType), example: SourcingType.PROCUREMENT })
  @IsEnum(SourcingType)
  sourcingType: SourcingType;

  @ApiPropertyOptional({ example: 12500, description: 'Required for online sourcing' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedPrice?: number;

  @ApiPropertyOptional({ example: 'With lumbar support' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [SellerReferenceDto], description: 'Online seller references (max 3)' })
  @IsArray()
  @ArrayMaxSize(3, { message: 'Maximum of 3 seller references allowed per item' })
  @ValidateNested({ each: true })
  @Type(() => SellerReferenceDto)
  @IsOptional()
  sellerReferences?: SellerReferenceDto[];

  @ApiPropertyOptional({ example: 'Only one supplier available in the market for this item' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  sellerReferencesJustification?: string;
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

  @ApiPropertyOptional({ example: '6650a1b2c3d4e5f678901234' })
  @IsMongoId()
  @IsOptional()
  projectId?: string;

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

export class SubmitQuotationItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(0)
  quotedUnitPrice: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  selectedSupplierId?: string;
}

export class SubmitQuotationDto {
  @ApiProperty({ type: [SubmitQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuotationItemDto)
  items: SubmitQuotationItemDto[];
}

export class ReturnForInfoDto {
  @ApiProperty({ example: 'Please provide exact model number and power specifications.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  note: string;
}
