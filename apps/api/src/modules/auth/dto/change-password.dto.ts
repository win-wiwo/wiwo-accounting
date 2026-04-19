import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'New password must contain at least one digit' })
  @Matches(/[^A-Za-z0-9]/, { message: 'New password must contain at least one special character' })
  newPassword: string;
}
