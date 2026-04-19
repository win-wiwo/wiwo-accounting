import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryApprovalsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseRequestId?: string;
}
