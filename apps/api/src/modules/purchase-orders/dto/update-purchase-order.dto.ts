import {
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Estimated arrival date (ISO string)' })
  @IsDateString()
  @IsOptional()
  estimatedArrivalDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  remarks?: string;
}
