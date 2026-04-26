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
import { AttachmentCategory } from '@prams/shared';
import { PurchaseRequestsService } from './purchase-requests.service';
import { CreatePurchaseRequestDto, UpdatePurchaseRequestDto, QueryPurchaseRequestsDto, SubmitQuotationDto, ReturnForInfoDto } from './dto';
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

  @Get('stats/management')
  @ApiOperation({ summary: 'Get management-level PR statistics' })
  async getManagementStats(
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.getManagementStats(user);
  }

  @Get('stats/by-project')
  @ApiOperation({ summary: 'Get PR spending grouped by project' })
  async getProjectSpending(
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.getProjectSpending(user);
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
  @ApiOperation({ summary: 'Recall a PR back to draft while it is still awaiting quotation or review' })
  async recall(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.recall(id, user);
  }

  @Post(':id/quotation')
  @ApiOperation({ summary: 'Procurement: submit price quotation for a PR' })
  async submitQuotation(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SubmitQuotationDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.submitQuotation(id, dto, user);
  }

  @Post(':id/return-for-info')
  @ApiOperation({ summary: 'Procurement: return PR to requester for more information' })
  async returnForInfo(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReturnForInfoDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.returnForInfo(id, dto.note, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a PR before approval work has started' })
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
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(pdf|jpeg|png|doc|docx|xls|xlsx|msword|vnd\.openxmlformats)/i, skipMagicNumbersValidation: true }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('category') category: string | undefined,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.addAttachment(id, file, user, category || AttachmentCategory.SUPPORTING_DOC);
  }

  @Post(':id/quotation-attachments')
  @ApiOperation({ summary: 'Procurement: upload quotation evidence for a purchase request' })
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
  async uploadQuotationAttachment(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(pdf|jpeg|png|doc|docx|xls|xlsx|msword|vnd\.openxmlformats)/i, skipMagicNumbersValidation: true }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.addQuotationAttachment(id, file, user);
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

  @Delete(':id/quotation-attachments/:attachmentId')
  @ApiOperation({ summary: 'Procurement: remove quotation evidence from a purchase request' })
  async removeQuotationAttachment(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('attachmentId', ParseObjectIdPipe) attachmentId: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.removeQuotationAttachment(id, attachmentId, user);
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

  @Post(':id/items/:itemId/photo')
  @ApiOperation({ summary: 'Upload a reference photo for a line item' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'item-photos'),
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
  async uploadItemPhoto(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('itemId', ParseObjectIdPipe) itemId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/i, skipMagicNumbersValidation: true }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.uploadItemPhoto(id, itemId, file, user);
  }

  @Delete(':id/items/:itemId/photo')
  @ApiOperation({ summary: 'Remove the reference photo from a line item' })
  async removeItemPhoto(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('itemId', ParseObjectIdPipe) itemId: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.prService.removeItemPhoto(id, itemId, user);
  }

  @Get(':id/items/:itemId/photo')
  @ApiOperation({ summary: 'View the reference photo for a line item' })
  async viewItemPhoto(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
    @Res() res: Response,
  ) {
    const pr = await this.prService.findById(id, user);
    const item = pr.items.find((i) => i._id.toString() === itemId);

    if (!item?.referencePhotoPath) {
      res.status(404).json({ message: 'No reference photo for this item' });
      return;
    }

    // Resolve path: support both absolute and relative (to cwd) paths
    const photoPath = item.referencePhotoPath.startsWith('/')
      ? item.referencePhotoPath
      : join(process.cwd(), item.referencePhotoPath);

    if (!existsSync(photoPath)) {
      res.status(404).json({ message: 'Photo file not found on disk' });
      return;
    }

    const ext = photoPath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
    const mime = mimeMap[ext ?? ''] ?? 'image/jpeg';

    res.setHeader('Content-Disposition', `inline; filename="${item.referencePhotoOriginalName ?? 'photo'}"`);
    res.setHeader('Content-Type', mime);
    createReadStream(photoPath).pipe(res);
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
