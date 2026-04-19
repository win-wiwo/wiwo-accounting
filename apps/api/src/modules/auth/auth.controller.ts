import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto } from './dto';
import { Public, CurrentUser } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser('_id') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return { message: 'No token provided' };
    }

    const [, token] = authHeader.split(' ');
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );

    return this.authService.refreshTokens(payload.sub, token);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @CurrentUser('_id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }
}
