import { IsString, IsOptional, MinLength, MaxLength, IsEnum, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-_]+$/, { message: 'Code must contain only letters, numbers, hyphens, or underscores' })
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['active', 'completed', 'archived'] })
  @IsEnum(['active', 'completed', 'archived'])
  @IsOptional()
  status?: string;
}
