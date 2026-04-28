import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Sse,
  MessageEvent,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Observable, EMPTY } from 'rxjs';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto';
import { CurrentUser, Public } from '../../common/decorators';
import { ParseObjectIdPipe } from '../../common/pipes';
import { UsersService } from '../users/users.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * SSE stream — browser connects here and receives a push whenever a new
   * notification is created for the authenticated user.
   *
   * EventSource cannot send custom headers, so the JWT is passed as ?token=
   * and validated manually. The endpoint is marked @Public() to bypass the
   * global JwtAuthGuard.
   */
  @Public()
  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream for real-time notifications' })
  async stream(@Query('token') token: string, @Req() req: Request): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const userId = user._id.toString();
    const stream$ = this.notificationsService.registerClient(userId);

    req.on('close', () => {
      this.notificationsService.removeClient(userId);
    });

    return stream$ as unknown as Observable<MessageEvent>;
  }

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async findAll(
    @Query() query: QueryNotificationsDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.notificationsService.findForUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('_id') userId: string) {
    return { count: await this.notificationsService.getUnreadCount(userId) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('_id') userId: string,
  ) {
    await this.notificationsService.markAsRead(id, userId);
    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('_id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }
}
