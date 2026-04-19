import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  IsIn,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class POLineItemDto {
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
  unitPrice: number;

  @ApiPropertyOptional({ example: 'With lumbar support' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Source Purchase Request or Job Request ID' })
  @IsMongoId()
  purchaseRequestId: string;

  @ApiProperty({ enum: ['purchase_request', 'job_request'] })
  @IsIn(['purchase_request', 'job_request'])
  sourceRequestType: string;

  @ApiPropertyOptional({ description: 'Selected supplier ID' })
  @IsMongoId()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'Office Renovation Phase 2' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ type: [POLineItemDto], description: 'Line items (auto-copied from PR if not provided)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POLineItemDto)
  @IsOptional()
  items?: POLineItemDto[];

  @ApiPropertyOptional({ example: 'Urgent procurement needed' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  remarks?: string;
}
