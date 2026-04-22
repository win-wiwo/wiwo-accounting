import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Office Renovation Phase 2' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'ORP2', description: 'Short project code (letters/numbers only)' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-_]+$/, { message: 'Code must contain only letters, numbers, hyphens, or underscores' })
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Second phase of the head office renovation project.' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
