import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuerySuppliersDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'ABC Trading' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'blacklisted'] })
  @IsString()
  @IsIn(['active', 'inactive', 'blacklisted'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'vat', enum: ['vat', 'non_vat'] })
  @IsString()
  @IsIn(['vat', 'non_vat'])
  @IsOptional()
  taxType?: string;

  @ApiPropertyOptional({ example: 'companyName', enum: ['companyName', 'createdAt', 'status'] })
  @IsString()
  @IsIn(['companyName', 'createdAt', 'status'])
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: string;
}
