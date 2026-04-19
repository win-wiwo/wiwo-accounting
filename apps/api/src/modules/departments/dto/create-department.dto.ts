import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ENG' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code: string;

  @ApiPropertyOptional({ example: 'Software engineering department' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;
}
