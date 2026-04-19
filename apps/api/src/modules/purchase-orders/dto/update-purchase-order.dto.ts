import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNumber,
  Min,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { POLineItemDto } from './create-purchase-order.dto';

export class CanvassQuotedItemDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  description: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  remarks?: string;
}

export class CanvassEntryDto {
  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsMongoId()
  supplierId: string;

  @ApiPropertyOptional({ description: 'Supplier name for display' })
  @IsString()
  @MaxLength(200)
  supplierName: string;

  @ApiPropertyOptional({ type: [CanvassQuotedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvassQuotedItemDto)
  @IsOptional()
  quotedItems?: CanvassQuotedItemDto[];

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  totalQuotedAmount: number;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSelected?: boolean;
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Selected supplier ID' })
  @IsMongoId()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'Office Renovation Phase 2' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ type: [POLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POLineItemDto)
  @IsOptional()
  items?: POLineItemDto[];

  @ApiPropertyOptional({ type: [CanvassEntryDto], description: 'Canvass entries (supplier quotes)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvassEntryDto)
  @IsOptional()
  canvassEntries?: CanvassEntryDto[];

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  remarks?: string;
}
