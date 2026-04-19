import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, USER_ROLES } from '@prams/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'EMP-0042' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  employeeId: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one digit' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ enum: USER_ROLES, example: 'staff' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;
}
