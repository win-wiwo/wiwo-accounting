import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@prams/shared';
import { PurchaseOrdersService } from './purchase-orders.service';
import { UpdatePurchaseOrderDto, QueryPurchaseOrdersDto } from './dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const proofPhotoStorage = diskStorage({
  destination: 'uploads/po-proofs',
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get PO summary stats' })
  async getStats() {
    return this.poService.getStats();
  }

  @Get('stats/monthly')
  @ApiOperation({ summary: 'Get monthly PO received count' })
  async getMonthlyStats() {
    const count = await this.poService.getMonthlyReceivedCount();
    return { data: { receivedThisMonth: count } };
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders with filters' })
  async findAll(
    @Query() query: QueryPurchaseOrdersDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.findAll(query, user);
  }

  @Get('by-pr/:prId')
  @ApiOperation({ summary: 'Get active purchase order linked to a purchase request' })
  async findByPr(@Param('prId', ParseObjectIdPipe) prId: string) {
    const po = await this.poService.findByPurchaseRequest(prId);
    return po;
  }

  @Get('all-by-pr/:prId')
  @ApiOperation({ summary: 'Get all purchase orders (including cancelled) for a purchase request' })
  async findAllByPr(@Param('prId', ParseObjectIdPipe) prId: string) {
    return this.poService.findAllByPurchaseRequest(prId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.findById(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a pending purchase order' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.update(id, dto, user);
  }

  @Post(':id/order')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark PO as ordered with estimated arrival date' })
  async markOrdered(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('estimatedArrivalDate') estimatedArrivalDate: string | null,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.markOrdered(id, estimatedArrivalDate, user);
  }

  @Patch(':id/arrival-date')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update estimated arrival date' })
  async updateArrivalDate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('estimatedArrivalDate') estimatedArrivalDate: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.updateArrivalDate(id, estimatedArrivalDate, user);
  }

  @Post(':id/receive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      storage: proofPhotoStorage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mark PO as received with proof photos (mobile-friendly)' })
  async markReceived(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('notes') notes: string | null,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one proof photo is required');
    }

    const photos = files.map((file) => ({
      originalName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
    }));

    return this.poService.markReceived(id, user, notes, photos);
  }

  @Post('from-pr/:prId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Issue a new PO from an approved PR (used after a prior PO was cancelled)' })
  async issueFromPr(
    @Param('prId', ParseObjectIdPipe) prId: string,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.createFromApprovedPR(prId, user._id);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROCUREMENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  async cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('reason') reason: string,
    @Body('prAction') prAction: 'keep_approved' | 'requeue_canvass' | 'cancel_pr' | undefined,
    @CurrentUser() user: { _id: string; role: string; departmentId: string | null },
  ) {
    return this.poService.cancel(id, reason, prAction ?? 'keep_approved', user);
  }
}
