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
  @ApiPropertyOptional({ description: 'MongoDB ObjectId of an existing item (used to preserve photo on update)' })
  @IsMongoId()
  @IsOptional()
  _id?: string;

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

  @ApiProperty({ example: 'Mesh back, lumbar support, adjustable height, 120kg capacity' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  specifications: string;

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

  @ApiProperty({ example: 'Busway Phase 2 Pole Hardware' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

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

  @ApiProperty({ example: 'Team expansion requires additional equipment.', description: 'Purpose of the request' })
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

  @ApiProperty({ example: 'Network Video Recorder 128-Channel' })
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SubmitQuotationCanvassEntryDto {
  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  supplierName: string;

  @ApiProperty({ type: [SubmitQuotationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuotationItemDto)
  quotedItems: SubmitQuotationItemDto[];

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  totalQuotedAmount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isSelected?: boolean;
}

export class SubmitQuotationDto {
  @ApiProperty({ type: [SubmitQuotationCanvassEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuotationCanvassEntryDto)
  canvassEntries: SubmitQuotationCanvassEntryDto[];

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  canvassJustification?: string;
}

// Draft-friendly variants: allow blank fields so procurement can save
// in-progress canvasses without satisfying every submit-time constraint.
export class CanvassDraftItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CanvassDraftEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ type: [CanvassDraftItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvassDraftItemDto)
  quotedItems?: CanvassDraftItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isSelected?: boolean;
}

export class SaveCanvassDraftDto {
  @ApiProperty({ type: [CanvassDraftEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvassDraftEntryDto)
  canvassEntries: CanvassDraftEntryDto[];

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  canvassJustification?: string;
}

export class ReturnForInfoDto {
  @ApiProperty({ example: 'Please provide exact model number and power specifications.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  note: string;
}

export class UpdateItemSpecDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  specifications: string;
}

export class UpdateItemSpecsDto {
  @ApiProperty({ type: [UpdateItemSpecDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemSpecDto)
  items: UpdateItemSpecDto[];
}
