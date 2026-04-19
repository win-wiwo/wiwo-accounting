import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseRequestsService } from './purchase-requests.service';
import { CreatePurchaseRequestDto, UpdatePurchaseRequestDto, QueryPurchaseRequestsDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Purchase Requests')
@ApiBearerAuth()
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly prService: PurchaseRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new purchase request (draft)' })
  async create(
    @Body() dto: CreatePurchaseRequestDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase requests with filters' })
  async findAll(
    @Query() query: QueryPurchaseRequestsDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.findAll(query, user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get PR statistics' })
  async getStats(
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.getStats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase request by ID' })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft/returned purchase request' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePurchaseRequestDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.update(id, dto, user);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a purchase request for approval' })
  async submit(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.submit(id, user);
  }

  @Post(':id/recall')
  @ApiOperation({ summary: 'Recall a submitted PR back to draft (before review starts)' })
  async recall(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.recall(id, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft or submitted PR' })
  async cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.cancel(id, reason, user);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload an attachment to a purchase request' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'attachments'),
        filename: (
          _req: Express.Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async uploadAttachment(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10 MB
          new FileTypeValidator({ fileType: /(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.addAttachment(id, file, user);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Remove an attachment from a purchase request' })
  async removeAttachment(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('attachmentId', ParseObjectIdPipe) attachmentId: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.removeAttachment(id, attachmentId, user);
  }

  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Download an attachment file' })
  async downloadAttachment(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
    @Res() res: Response,
  ) {
    const pr = await this.prService.findById(id, user);
    const attachment = pr.attachments.find(
      (a) => a._id.toString() === attachmentId,
    );

    if (!attachment) {
      res.status(404).json({ message: 'Attachment not found' });
      return;
    }

    if (!existsSync(attachment.storagePath)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    createReadStream(attachment.storagePath).pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft purchase request' })
  async delete(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    await this.prService.delete(id, user);
    return { message: 'Purchase request deleted' };
  }
}
