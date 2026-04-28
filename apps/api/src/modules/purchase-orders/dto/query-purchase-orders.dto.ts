import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryPurchaseOrdersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Single status or comma-separated statuses', enum: ['pending', 'ordered', 'received', 'cancelled'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by supplier ID' })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ enum: ['purchase_request', 'job_request'] })
  @IsIn(['purchase_request', 'job_request'])
  @IsOptional()
  sourceRequestType?: string;

  @ApiPropertyOptional({ description: 'Filter POs created on or after this date (ISO string)' })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter POs created on or before this date (ISO string)' })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'totalAmount', 'poNumber'] })
  @IsString()
  @IsOptional()
  sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
