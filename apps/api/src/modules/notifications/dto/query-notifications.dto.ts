import { IsOptional, IsNumberString, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNotificationsDto {
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
  @IsBooleanString()
  unreadOnly?: string;
}
