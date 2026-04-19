import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole, USER_ROLES } from '@prams/shared';

export class QueryUsersDto {
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

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'firstName', 'lastName', 'email'] })
  @IsString()
  @IsOptional()
  sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
