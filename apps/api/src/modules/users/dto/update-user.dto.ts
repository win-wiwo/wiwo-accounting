import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, USER_ROLES } from '@prams/shared';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john.doe@company.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string | null;
}
