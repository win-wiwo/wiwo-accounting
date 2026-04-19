import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
