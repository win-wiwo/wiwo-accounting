---
name: add-module
description: Full end-to-end checklist for adding a new domain module to PRAMS — covers backend schema, service, controller, module registration, shared types, and frontend hooks/page/routing.
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep"]
---

# Add a New Module to PRAMS

Use this skill when implementing a new domain feature (e.g., a new entity with CRUD operations and a frontend page).

---

## Phase 1 — Shared Types (do this first)

Both the API and frontend import from `packages/shared`. Define the contract before writing either side.

### 1.1 Create the type file

```typescript
// packages/shared/src/types/xxx.types.ts
export interface Xxx {
  _id: string;
  name: string;
  // ... fields
  createdAt: string;
  updatedAt: string;
}

export interface CreateXxxDto {
  name: string;
  // ... required fields
}

export interface UpdateXxxDto {
  name?: string;
  // ... all optional
}
```

### 1.2 Export from the types index

```typescript
// packages/shared/src/types/index.ts  — add:
export * from './xxx.types';
```

---

## Phase 2 — Backend: Schema

```typescript
// apps/api/src/modules/xxx/schemas/xxx.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Xxx extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  // Foreign key reference:
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // Optional string:
  @Prop({ type: String, default: null, trim: true })
  description: string | null;

  // Every schema gets these from timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const XxxSchema = SchemaFactory.createForClass(Xxx);

// Indexes — always add at minimum:
XxxSchema.index({ createdAt: -1 });

// Strip __v from JSON output:
XxxSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
} as never);
```

**Critical rules:**
- Every stored field MUST have `@Prop()` — TypeScript class fields without `@Prop()` are invisible to Mongoose
- Use `Types.ObjectId` for cross-collection references, never raw strings
- Add `| null` to the TypeScript type when the field has `default: null`
- `createdAt` and `updatedAt` are declared without `@Prop()` — they come from `timestamps: true`

---

## Phase 3 — Backend: DTOs

```typescript
// apps/api/src/modules/xxx/dto/create-xxx.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateXxxDto {
  @ApiProperty({ example: 'Example name' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

// apps/api/src/modules/xxx/dto/update-xxx.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateXxxDto } from './create-xxx.dto';
export class UpdateXxxDto extends PartialType(CreateXxxDto) {}

// apps/api/src/modules/xxx/dto/query-xxx.dto.ts
import { IsOptional, IsNumberString } from 'class-validator';
export class QueryXxxDto {
  @IsOptional() @IsNumberString() page?: number;
  @IsOptional() @IsNumberString() limit?: number;
  @IsOptional() search?: string;
}

// apps/api/src/modules/xxx/dto/index.ts
export * from './create-xxx.dto';
export * from './update-xxx.dto';
export * from './query-xxx.dto';
```

---

## Phase 4 — Backend: Service

```typescript
// apps/api/src/modules/xxx/xxx.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Xxx } from './schemas/xxx.schema';
import { CreateXxxDto, UpdateXxxDto, QueryXxxDto } from './dto';

@Injectable()
export class XxxService {
  constructor(@InjectModel(Xxx.name) private xxxModel: Model<Xxx>) {}

  async findAll(query: QueryXxxDto) {
    const { page = 1, limit = 20, search } = query;
    const filter: FilterQuery<Xxx> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.xxxModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.xxxModel.countDocuments(filter),
    ]);

    // Return { data, meta } — TransformInterceptor unwraps this into the response envelope
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<Xxx> {
    const item = await this.xxxModel.findById(id).exec();
    if (!item) throw new NotFoundException('Xxx not found');
    return item;
  }

  async create(dto: CreateXxxDto, createdById: string): Promise<Xxx> {
    const item = new this.xxxModel({
      ...dto,
      createdBy: createdById,
    });
    return item.save();
  }

  async update(id: string, dto: UpdateXxxDto): Promise<Xxx> {
    const item = await this.xxxModel.findById(id);
    if (!item) throw new NotFoundException('Xxx not found');
    Object.assign(item, dto);  // or assign field by field
    return item.save();
  }
}
```

**Key rule:** List endpoints MUST return `{ data: array, meta: { total, page, limit, totalPages } }`. The `TransformInterceptor` detects this shape and produces the correct envelope. Any other shape goes in `data` directly.

---

## Phase 5 — Backend: Controller

```typescript
// apps/api/src/modules/xxx/xxx.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prams/shared';
import { XxxService } from './xxx.service';
import { CreateXxxDto, UpdateXxxDto, QueryXxxDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ParseObjectIdPipe } from '../../common/pipes';

@ApiTags('Xxx')
@ApiBearerAuth()
@Controller('xxx')
export class XxxController {
  constructor(private readonly xxxService: XxxService) {}

  @Get()
  @ApiOperation({ summary: 'List all xxx' })
  async findAll(@Query() query: QueryXxxDto) {
    return this.xxxService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.xxxService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)           // ← restrict write access
  @UseGuards(RolesGuard)
  async create(@Body() dto: CreateXxxDto, @CurrentUser() user: { _id: string }) {
    return this.xxxService.create(dto, user._id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateXxxDto) {
    return this.xxxService.update(id, dto);
  }
}
```

---

## Phase 6 — Backend: Module File + Registration

```typescript
// apps/api/src/modules/xxx/xxx.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { XxxController } from './xxx.controller';
import { XxxService } from './xxx.service';
import { Xxx, XxxSchema } from './schemas/xxx.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Xxx.name, schema: XxxSchema }])],
  controllers: [XxxController],
  providers: [XxxService],
  exports: [XxxService],  // export if other modules need it
})
export class XxxModule {}
```

**Register in `app.module.ts`** — this step is easy to forget:
```typescript
// apps/api/src/app.module.ts
import { XxxModule } from './modules/xxx/xxx.module';

@Module({
  imports: [
    // ...existing modules...
    XxxModule,   // ← add here
  ],
})
```

---

## Phase 7 — Frontend: API Services

```typescript
// apps/web/src/lib/api-services.ts — add at bottom:

export interface XxxQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const xxxApi = {
  list: (params: XxxQuery = {}) =>
    apiClient
      .get<ApiResponse<import('@prams/shared').Xxx[]> & { meta: PaginationMeta }>('/xxx', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<import('@prams/shared').Xxx>>(`/xxx/${id}`).then((r) => r.data),

  create: (data: import('@prams/shared').CreateXxxDto) =>
    apiClient.post<ApiResponse<import('@prams/shared').Xxx>>('/xxx', data).then((r) => r.data),

  update: (id: string, data: import('@prams/shared').UpdateXxxDto) =>
    apiClient.patch<ApiResponse<import('@prams/shared').Xxx>>(`/xxx/${id}`, data).then((r) => r.data),
};
```

---

## Phase 8 — Frontend: React Query Hooks

```typescript
// apps/web/src/hooks/use-xxx.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { xxxApi, type XxxQuery } from '@/lib/api-services';
import type { CreateXxxDto, UpdateXxxDto } from '@prams/shared';

export function useXxxList(params: XxxQuery = {}) {
  return useQuery({
    queryKey: ['xxx', params],
    queryFn: () => xxxApi.list(params),
  });
}

export function useCreateXxx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateXxxDto) => xxxApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['xxx'] }); },
  });
}

export function useUpdateXxx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateXxxDto }) => xxxApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['xxx'] }); },
  });
}
```

---

## Phase 9 — Frontend: Route + Sidebar

```typescript
// apps/web/src/App.tsx — add inside the protected layout route:
<Route
  path="/xxx"
  element={
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <XxxPage />
    </ProtectedRoute>
  }
/>
```

```typescript
// apps/web/src/components/layout/sidebar.tsx — add to adminNavigation array:
{
  label: 'Xxx',
  href: '/xxx',
  icon: SomeIcon,         // import from lucide-react
  roles: [UserRole.ADMIN],
},
```

**Make sure `allowedRoles` in `App.tsx` matches `roles` in `sidebar.tsx`.** If they differ, the link shows but the page 403s, or the page works but the link is hidden.

---

## Final Verification Checklist

```bash
# Backend compiles:
docker logs prams-api --tail 10
# Look for: "Nest application successfully started"

# New routes are registered:
docker logs prams-api | grep "Mapped.*xxx"

# API responds:
curl http://localhost:3000/api/xxx \
  -H "Authorization: Bearer YOUR_TOKEN"

# Frontend builds (no TS errors):
docker logs prams-web --tail 10
```
