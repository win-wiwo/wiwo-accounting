import { IsOptional, IsString, IsEnum, IsNumber, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrPriority, PR_PRIORITIES } from '@prams/shared';

export class QueryPurchaseRequestsDto {
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

  @ApiPropertyOptional({ description: 'Single status or comma-separated statuses' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: PR_PRIORITIES })
  @IsEnum(PrPriority)
  @IsOptional()
  priority?: PrPriority;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requesterId?: string;

  @ApiPropertyOptional({ description: 'Filter PRs created on or after this date (ISO string)' })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter PRs created on or before this date (ISO string)' })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter PRs with totalAmount >= this value' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  amountMin?: number;

  @ApiPropertyOptional({ description: 'Filter PRs with totalAmount <= this value' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  amountMax?: number;

  @ApiPropertyOptional({ enum: ['purchase_request', 'job_request'] })
  @IsIn(['purchase_request', 'job_request'])
  @IsOptional()
  requestType?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'totalAmount', 'prNumber', 'submittedAt'] })
  @IsString()
  @IsOptional()
  sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
