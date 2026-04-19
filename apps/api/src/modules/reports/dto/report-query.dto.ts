import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Department ID filter' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['excel', 'pdf'], default: 'excel' })
  @IsOptional()
  @IsEnum(['excel', 'pdf'])
  format?: 'excel' | 'pdf';
}
