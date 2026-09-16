# Service Templates + Client Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let projects be created from a reusable per-service-type stage
template (auto-generating the Gantt tasks in sequence), with each client
able to permanently disable stages that don't apply to them.

**Architecture:** Three new backend modules (`ServiceTypesModule`,
`StageTemplatesModule`, `ClientsModule`) sit below the existing
`ProjectsModule`/`TasksModule`. `ProjectsService.create()` orchestrates:
validate client/service type are active → create the `Project` → resolve
the ordered `StageTemplate` list minus the client's disabled ids → ask
`TasksService.generateFromTemplate()` to create the chained `Task`
documents. On the frontend, two new admin sections (`/tipos-servico`,
`/clientes`) manage the templates and per-client overrides; project
creation gains Cliente/Tipo de Serviço/Data de início fields.

**Tech Stack:** NestJS + Mongoose (backend), React + Vite + TypeScript +
Tailwind (frontend), Vitest everywhere.

**Spec:** `docs/superpowers/specs/2026-09-15-service-templates-design.md`

## Global Constraints

- Backend: ESM throughout — every relative import needs an explicit
  `.js` extension even though source files are `.ts`.
- Backend: new controllers are auth-protected by default (global
  `JwtAuthGuard`); mutating endpoints need `@Roles('admin')` explicitly
  (see `auth/roles.decorator.ts`), read endpoints stay open to any
  authenticated user.
- Backend: schemas use `@nestjs/mongoose` `@Schema({ timestamps: true })`
  decorators; cross-document refs use `Types.ObjectId` with a string
  `ref`.
- Frontend: relative imports use explicit `.js` extensions on
  `.ts`/`.tsx` files.
- Frontend: no new npm dependencies — reorder UI uses plain up/down
  buttons, not a drag-and-drop library.
- Frontend: API calls only through `src/api/*.ts` wrapper functions, never
  axios directly from components.
- Template edits only affect **new** projects — no versioning, no
  retroactive changes to existing projects' tasks.
- `Client` stays minimal (`name`, `active`) — no CRM fields.

---

## Task 1: Shared `Sector` type (backend)

**Files:**
- Create: `backend/src/common/sector.ts`

**Interfaces:**
- Produces: `SECTORS` (readonly tuple of 5 sector strings), `Sector`
  (union type) — imported by every task in this plan that touches
  User/Task/StageTemplate schemas or DTOs.

- [ ] **Step 1: Create the shared sector constant and type**

```typescript
// backend/src/common/sector.ts
export const SECTORS = [
  'diretoria',
  'diretoria_executiva',
  'diretoria_criacao',
  'criacao',
  'desenvolvimento',
] as const;

export type Sector = (typeof SECTORS)[number];
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --prefix backend`
Expected: build succeeds (no other file references it yet, so this is
just a syntax check).

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/sector.ts
git commit -m "feat(backend): add shared Sector enum"
```

---

## Task 2: ServiceType module (backend)

**Files:**
- Create: `backend/src/service-types/schemas/service-type.schema.ts`
- Create: `backend/src/service-types/dto/create-service-type.dto.ts`
- Create: `backend/src/service-types/dto/update-service-type.dto.ts`
- Create: `backend/src/service-types/service-types.service.ts`
- Create: `backend/src/service-types/service-types.controller.ts`
- Create: `backend/src/service-types/service-types.module.ts`
- Test: `backend/src/service-types/service-types.service.spec.ts`
- Test: `backend/test/service-types.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `Roles` decorator from `../auth/roles.decorator.js` (same
  pattern as `UsersController`).
- Produces: `ServiceTypesService` with `create(dto)`, `findAll()`,
  `update(id, dto)`, `assertActive(id): Promise<ServiceTypeDocument>`
  (throws `BadRequestException` if missing/inactive) — `assertActive`
  is consumed by Task 4 (StageTemplatesService) and Task 8
  (ProjectsService). `ServiceTypesModule` exports `ServiceTypesService`.

- [ ] **Step 1: Write the schema**

```typescript
// backend/src/service-types/schemas/service-type.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceTypeDocument = HydratedDocument<ServiceType>;

@Schema({ timestamps: true })
export class ServiceType {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const ServiceTypeSchema = SchemaFactory.createForClass(ServiceType);
```

- [ ] **Step 2: Write the DTOs**

```typescript
// backend/src/service-types/dto/create-service-type.dto.ts
import { IsString } from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  name: string;
}
```

```typescript
// backend/src/service-types/dto/update-service-type.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateServiceTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
```

- [ ] **Step 3: Write the failing unit test for the service**

```typescript
// backend/src/service-types/service-types.service.spec.ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service.js';
import { ServiceType } from './schemas/service-type.schema.js';

describe('ServiceTypesService', () => {
  let service: ServiceTypesService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ServiceTypesService,
        { provide: getModelToken(ServiceType.name), useValue: modelMock },
      ],
    }).compile();
    service = moduleRef.get(ServiceTypesService);
  });

  it('throws NotFoundException when updating a missing service type', async () => {
    modelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('assertActive throws BadRequestException when inactive', async () => {
    modelMock.findById.mockResolvedValue({ _id: '1', active: false });

    await expect(service.assertActive('1')).rejects.toThrow(BadRequestException);
  });

  it('assertActive throws BadRequestException when missing', async () => {
    modelMock.findById.mockResolvedValue(null);

    await expect(service.assertActive('missing-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('assertActive returns the document when active', async () => {
    const doc = { _id: '1', active: true };
    modelMock.findById.mockResolvedValue(doc);

    await expect(service.assertActive('1')).resolves.toBe(doc);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/service-types/service-types.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — `Cannot find module './service-types.service.js'`

- [ ] **Step 5: Write the service**

```typescript
// backend/src/service-types/service-types.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceType, ServiceTypeDocument } from './schemas/service-type.schema.js';
import { CreateServiceTypeDto } from './dto/create-service-type.dto.js';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto.js';

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectModel(ServiceType.name) private readonly serviceTypeModel: Model<ServiceType>,
  ) {}

  create(dto: CreateServiceTypeDto) {
    return this.serviceTypeModel.create({ name: dto.name });
  }

  findAll(): Promise<ServiceTypeDocument[]> {
    return this.serviceTypeModel.find() as Promise<ServiceTypeDocument[]>;
  }

  async update(id: string, dto: UpdateServiceTypeDto): Promise<ServiceTypeDocument> {
    const updated = (await this.serviceTypeModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as ServiceTypeDocument | null;
    if (!updated) {
      throw new NotFoundException(`ServiceType ${id} not found`);
    }
    return updated;
  }

  async assertActive(id: string): Promise<ServiceTypeDocument> {
    const serviceType = (await this.serviceTypeModel.findById(id)) as ServiceTypeDocument | null;
    if (!serviceType || !serviceType.active) {
      throw new BadRequestException(`Service type ${id} not found or inactive`);
    }
    return serviceType;
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/service-types/service-types.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (4 tests)

- [ ] **Step 7: Write the controller**

```typescript
// backend/src/service-types/service-types.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service.js';
import { CreateServiceTypeDto } from './dto/create-service-type.dto.js';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypesService: ServiceTypesService) {}

  @Get()
  findAll() {
    return this.serviceTypesService.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateServiceTypeDto) {
    return this.serviceTypesService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceTypeDto) {
    return this.serviceTypesService.update(id, dto);
  }
}
```

- [ ] **Step 8: Write the module**

```typescript
// backend/src/service-types/service-types.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceTypesService } from './service-types.service.js';
import { ServiceTypesController } from './service-types.controller.js';
import { ServiceType, ServiceTypeSchema } from './schemas/service-type.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ServiceType.name, schema: ServiceTypeSchema }])],
  providers: [ServiceTypesService],
  controllers: [ServiceTypesController],
  exports: [ServiceTypesService],
})
export class ServiceTypesModule {}
```

- [ ] **Step 9: Wire it into `AppModule`**

Modify `backend/src/app.module.ts`: add
`import { ServiceTypesModule } from './service-types/service-types.module.js';`
near the other module imports, and add `ServiceTypesModule` to the
`imports` array (alongside `ProjectsModule`, `TasksModule`).

- [ ] **Step 10: Write the failing e2e test**

```typescript
// backend/test/service-types.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('ServiceTypes (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;

  beforeAll(async () => {
    ({ stop: stopDb } = await startTestDb());
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' });
    token = login.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('creates, lists and deactivates a service type', async () => {
    const created = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Social Media' })
      .expect(201);
    expect(created.body.active).toBe(true);

    const list = await request(app.getHttpServer())
      .get('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const deactivated = await request(app.getHttpServer())
      .patch(`/service-types/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false })
      .expect(200);
    expect(deactivated.body.active).toBe(false);
  });
});
```

- [ ] **Step 11: Run the e2e test to verify it fails**

Run: `npx vitest run test/service-types.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: FAIL — route not found (404) if module wiring is missing, or
pass if Steps 1-9 already done correctly. If it's already passing at
this point, Step 9 was completed correctly — continue.

- [ ] **Step 12: Run it again to confirm it passes**

Run: `npx vitest run test/service-types.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add backend/src/service-types backend/src/app.module.ts backend/test/service-types.e2e-spec.ts
git commit -m "feat(backend): add ServiceType CRUD module"
```

---

## Task 3: StageTemplate module (backend)

**Files:**
- Create: `backend/src/stage-templates/schemas/stage-template.schema.ts`
- Create: `backend/src/stage-templates/dto/create-stage-template.dto.ts`
- Create: `backend/src/stage-templates/dto/update-stage-template.dto.ts`
- Create: `backend/src/stage-templates/dto/reorder-stage-templates.dto.ts`
- Create: `backend/src/stage-templates/stage-templates.service.ts`
- Create: `backend/src/stage-templates/stage-templates.controller.ts`
- Create: `backend/src/stage-templates/stage-templates.module.ts`
- Test: `backend/src/stage-templates/stage-templates.service.spec.ts`
- Test: `backend/test/stage-templates.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `Sector`/`SECTORS` from `../common/sector.js` (Task 1);
  `ServiceTypesService.assertActive(id)` from `../service-types/service-types.service.js` (Task 2).
- Produces: `StageTemplatesService` with `create(serviceTypeId, dto)`,
  `findAllForServiceType(serviceTypeId): Promise<StageTemplateDocument[]>`
  (sorted by `order` ascending — consumed by Task 8's
  `ProjectsService.create()` and Task 5's `ClientsService`), `update(id, dto)`,
  `remove(id)`, `reorder(serviceTypeId, orderedIds): Promise<StageTemplateDocument[]>`.
  `StageTemplatesModule` imports `ServiceTypesModule` and exports
  `StageTemplatesService`.

- [ ] **Step 1: Write the schema**

```typescript
// backend/src/stage-templates/schemas/stage-template.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SECTORS, Sector } from '../../common/sector.js';

export type StageTemplateDocument = HydratedDocument<StageTemplate>;

@Schema({ timestamps: true })
export class StageTemplate {
  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  order: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, enum: SECTORS })
  defaultSector: Sector;

  @Prop({ required: true, min: 1 })
  defaultDurationDays: number;
}

export const StageTemplateSchema = SchemaFactory.createForClass(StageTemplate);
StageTemplateSchema.index({ serviceTypeId: 1, order: 1 }, { unique: true });
```

- [ ] **Step 2: Write the DTOs**

```typescript
// backend/src/stage-templates/dto/create-stage-template.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SECTORS, Sector } from '../../common/sector.js';

export class CreateStageTemplateDto {
  @IsString()
  name: string;

  @IsIn(SECTORS)
  defaultSector: Sector;

  @IsInt()
  @Min(1)
  defaultDurationDays: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
```

```typescript
// backend/src/stage-templates/dto/update-stage-template.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SECTORS, Sector } from '../../common/sector.js';

export class UpdateStageTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(SECTORS)
  defaultSector?: Sector;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultDurationDays?: number;
}
```

```typescript
// backend/src/stage-templates/dto/reorder-stage-templates.dto.ts
import { IsArray, IsString } from 'class-validator';

export class ReorderStageTemplatesDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
```

- [ ] **Step 3: Write the failing unit test for the service**

```typescript
// backend/src/stage-templates/stage-templates.service.spec.ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StageTemplatesService } from './stage-templates.service.js';
import { StageTemplate } from './schemas/stage-template.schema.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

describe('StageTemplatesService', () => {
  let service: StageTemplatesService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateOne: vi.fn(),
  };
  const serviceTypesServiceMock = { assertActive: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        StageTemplatesService,
        { provide: getModelToken(StageTemplate.name), useValue: modelMock },
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(StageTemplatesService);
  });

  it('creates a stage template with the next order when order is omitted', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.countDocuments.mockResolvedValue(2);
    modelMock.create.mockResolvedValue({ _id: 'stage-1', order: 2 });

    await service.create('st1', {
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 3,
    });

    expect(modelMock.create).toHaveBeenCalledWith({
      serviceTypeId: 'st1',
      order: 2,
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 3,
    });
  });

  it('throws NotFoundException when updating a missing stage template', async () => {
    modelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects reorder when the id set does not match the service type stages', async () => {
    modelMock.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]),
    });

    await expect(service.reorder('st1', ['a', 'c'])).rejects.toThrow(BadRequestException);
  });

  it('reorders stages by writing the new order to each', async () => {
    modelMock.find
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]) })
      .mockReturnValueOnce(Promise.resolve([{ _id: 'b', order: 0 }, { _id: 'a', order: 1 }]));
    modelMock.updateOne.mockResolvedValue({});

    // Mongoose's .find() without .lean() returns a thenable query; the
    // second mockReturnValueOnce above stands in for that.
    const findSpy = modelMock.find as unknown as { mock: { calls: unknown[][] } };
    await service.reorder('st1', ['b', 'a']);

    expect(modelMock.updateOne).toHaveBeenNthCalledWith(1, { _id: 'b' }, { order: 0 });
    expect(modelMock.updateOne).toHaveBeenNthCalledWith(2, { _id: 'a' }, { order: 1 });
    expect(findSpy.mock.calls).toHaveLength(2);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/stage-templates/stage-templates.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — `Cannot find module './stage-templates.service.js'`

- [ ] **Step 5: Write the service**

```typescript
// backend/src/stage-templates/stage-templates.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StageTemplate, StageTemplateDocument } from './schemas/stage-template.schema.js';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto.js';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

@Injectable()
export class StageTemplatesService {
  constructor(
    @InjectModel(StageTemplate.name) private readonly stageTemplateModel: Model<StageTemplate>,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  async create(serviceTypeId: string, dto: CreateStageTemplateDto): Promise<StageTemplateDocument> {
    await this.serviceTypesService.assertActive(serviceTypeId);
    const order = dto.order ?? (await this.stageTemplateModel.countDocuments({ serviceTypeId }));
    return this.stageTemplateModel.create({
      serviceTypeId,
      order,
      name: dto.name,
      defaultSector: dto.defaultSector,
      defaultDurationDays: dto.defaultDurationDays,
    }) as Promise<StageTemplateDocument>;
  }

  findAllForServiceType(serviceTypeId: string): Promise<StageTemplateDocument[]> {
    return this.stageTemplateModel
      .find({ serviceTypeId })
      .sort({ order: 1 }) as Promise<StageTemplateDocument[]>;
  }

  async update(id: string, dto: UpdateStageTemplateDto): Promise<StageTemplateDocument> {
    const updated = (await this.stageTemplateModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as StageTemplateDocument | null;
    if (!updated) {
      throw new NotFoundException(`StageTemplate ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.stageTemplateModel.findByIdAndDelete(id);
    if (!removed) {
      throw new NotFoundException(`StageTemplate ${id} not found`);
    }
  }

  async reorder(serviceTypeId: string, orderedIds: string[]): Promise<StageTemplateDocument[]> {
    const existing = await this.stageTemplateModel.find({ serviceTypeId }).lean();
    const existingIds = existing.map((t) => t._id.toString());
    const sameSet =
      existingIds.length === orderedIds.length &&
      existingIds.every((id) => orderedIds.includes(id));
    if (!sameSet) {
      throw new BadRequestException(
        'orderedIds must match exactly the stage templates of this service type',
      );
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        this.stageTemplateModel.updateOne({ _id: id }, { order: index }),
      ),
    );

    return this.findAllForServiceType(serviceTypeId);
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/stage-templates/stage-templates.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (4 tests)

- [ ] **Step 7: Write the controller**

```typescript
// backend/src/stage-templates/stage-templates.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { StageTemplatesService } from './stage-templates.service.js';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto.js';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto.js';
import { ReorderStageTemplatesDto } from './dto/reorder-stage-templates.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller()
export class StageTemplatesController {
  constructor(private readonly stageTemplatesService: StageTemplatesService) {}

  @Get('service-types/:serviceTypeId/stage-templates')
  findAllForServiceType(@Param('serviceTypeId') serviceTypeId: string) {
    return this.stageTemplatesService.findAllForServiceType(serviceTypeId);
  }

  @Roles('admin')
  @Post('service-types/:serviceTypeId/stage-templates')
  create(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: CreateStageTemplateDto) {
    return this.stageTemplatesService.create(serviceTypeId, dto);
  }

  @Roles('admin')
  @Patch('stage-templates/:id')
  update(@Param('id') id: string, @Body() dto: UpdateStageTemplateDto) {
    return this.stageTemplatesService.update(id, dto);
  }

  @Roles('admin')
  @Delete('stage-templates/:id')
  remove(@Param('id') id: string) {
    return this.stageTemplatesService.remove(id);
  }

  @Roles('admin')
  @Put('service-types/:serviceTypeId/stage-templates/reorder')
  reorder(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: ReorderStageTemplatesDto) {
    return this.stageTemplatesService.reorder(serviceTypeId, dto.orderedIds);
  }
}
```

- [ ] **Step 8: Write the module**

```typescript
// backend/src/stage-templates/stage-templates.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StageTemplatesService } from './stage-templates.service.js';
import { StageTemplatesController } from './stage-templates.controller.js';
import { StageTemplate, StageTemplateSchema } from './schemas/stage-template.schema.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StageTemplate.name, schema: StageTemplateSchema }]),
    ServiceTypesModule,
  ],
  providers: [StageTemplatesService],
  controllers: [StageTemplatesController],
  exports: [StageTemplatesService],
})
export class StageTemplatesModule {}
```

- [ ] **Step 9: Wire it into `AppModule`**

Modify `backend/src/app.module.ts`: import `StageTemplatesModule` from
`./stage-templates/stage-templates.module.js` and add it to `imports`.

- [ ] **Step 10: Write the failing e2e test**

```typescript
// backend/test/stage-templates.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('StageTemplates (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;
  let serviceTypeId: string;

  beforeAll(async () => {
    ({ stop: stopDb } = await startTestDb());
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' });
    token = login.body.accessToken;

    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Social Media' });
    serviceTypeId = serviceType.body._id;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('creates stages in order, reorders them, and rejects an incomplete reorder', async () => {
    const stage1 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Briefing', defaultSector: 'diretoria_criacao', defaultDurationDays: 2 })
      .expect(201);
    expect(stage1.body.order).toBe(0);

    const stage2 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cronograma', defaultSector: 'criacao', defaultDurationDays: 3 })
      .expect(201);
    expect(stage2.body.order).toBe(1);

    const reordered = await request(app.getHttpServer())
      .put(`/service-types/${serviceTypeId}/stage-templates/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedIds: [stage2.body._id, stage1.body._id] })
      .expect(200);
    expect(reordered.body[0]._id).toBe(stage2.body._id);
    expect(reordered.body[0].order).toBe(0);

    await request(app.getHttpServer())
      .put(`/service-types/${serviceTypeId}/stage-templates/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedIds: [stage1.body._id] })
      .expect(400);
  });
});
```

- [ ] **Step 11: Run the e2e test and confirm it passes**

Run: `npx vitest run test/stage-templates.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add backend/src/stage-templates backend/src/app.module.ts backend/test/stage-templates.e2e-spec.ts
git commit -m "feat(backend): add StageTemplate module with ordering"
```

---

## Task 4: Client + ClientServiceOverride module (backend)

**Files:**
- Create: `backend/src/clients/schemas/client.schema.ts`
- Create: `backend/src/clients/schemas/client-service-override.schema.ts`
- Create: `backend/src/clients/dto/create-client.dto.ts`
- Create: `backend/src/clients/dto/update-client.dto.ts`
- Create: `backend/src/clients/dto/update-client-override.dto.ts`
- Create: `backend/src/clients/clients.service.ts`
- Create: `backend/src/clients/clients.controller.ts`
- Create: `backend/src/clients/clients.module.ts`
- Test: `backend/src/clients/clients.service.spec.ts`
- Test: `backend/test/clients.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `StageTemplatesService.findAllForServiceType(serviceTypeId)`
  from Task 3.
- Produces: `ClientsService` with `create(dto)`, `findAll()`,
  `update(id, dto)`, `assertActive(id): Promise<ClientDocument>` (throws
  `BadRequestException`, consumed by Task 8's `ProjectsService`),
  `getDisabledStageTemplateIds(clientId, serviceTypeId): Promise<string[]>`
  (returns `[]` when no override exists — consumed by Task 8),
  `setDisabledStages(clientId, serviceTypeId, disabledStageTemplateIds): Promise<ClientServiceOverrideDocument>`.
  `ClientsModule` imports `StageTemplatesModule` and exports
  `ClientsService`.

- [ ] **Step 1: Write the schemas**

```typescript
// backend/src/clients/schemas/client.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
```

```typescript
// backend/src/clients/schemas/client-service-override.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ClientServiceOverrideDocument = HydratedDocument<ClientServiceOverride>;

@Schema({ timestamps: true })
export class ClientServiceOverride {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'StageTemplate' }], default: [] })
  disabledStageTemplateIds: Types.ObjectId[];
}

export const ClientServiceOverrideSchema = SchemaFactory.createForClass(ClientServiceOverride);
ClientServiceOverrideSchema.index({ clientId: 1, serviceTypeId: 1 }, { unique: true });
```

- [ ] **Step 2: Write the DTOs**

```typescript
// backend/src/clients/dto/create-client.dto.ts
import { IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;
}
```

```typescript
// backend/src/clients/dto/update-client.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
```

```typescript
// backend/src/clients/dto/update-client-override.dto.ts
import { IsArray, IsString } from 'class-validator';

export class UpdateClientOverrideDto {
  @IsArray()
  @IsString({ each: true })
  disabledStageTemplateIds: string[];
}
```

- [ ] **Step 3: Write the failing unit test for the service**

```typescript
// backend/src/clients/clients.service.spec.ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { Client } from './schemas/client.schema.js';
import { ClientServiceOverride } from './schemas/client-service-override.schema.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';

describe('ClientsService', () => {
  let service: ClientsService;
  const clientModelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  const overrideModelMock = {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  };
  const stageTemplatesServiceMock = { findAllForServiceType: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client.name), useValue: clientModelMock },
        { provide: getModelToken(ClientServiceOverride.name), useValue: overrideModelMock },
        { provide: StageTemplatesService, useValue: stageTemplatesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(ClientsService);
  });

  it('throws NotFoundException when updating a missing client', async () => {
    clientModelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns an empty array when no override exists', async () => {
    overrideModelMock.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    await expect(service.getDisabledStageTemplateIds('c1', 'st1')).resolves.toEqual([]);
  });

  it('returns the stored disabled ids as strings', async () => {
    overrideModelMock.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ disabledStageTemplateIds: [{ toString: () => 's1' }] }),
    });

    await expect(service.getDisabledStageTemplateIds('c1', 'st1')).resolves.toEqual(['s1']);
  });

  it('rejects setDisabledStages with an id that is not part of the service type', async () => {
    clientModelMock.findById.mockResolvedValue({ _id: 'c1', active: true });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: 's1' },
    ]);

    await expect(
      service.setDisabledStages('c1', 'st1', ['s1', 'not-real']),
    ).rejects.toThrow(BadRequestException);
  });

  it('upserts the override when all ids are valid', async () => {
    clientModelMock.findById.mockResolvedValue({ _id: 'c1', active: true });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' } },
      { _id: { toString: () => 's2' } },
    ]);
    overrideModelMock.findOneAndUpdate.mockResolvedValue({ disabledStageTemplateIds: ['s1'] });

    await service.setDisabledStages('c1', 'st1', ['s1']);

    expect(overrideModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { clientId: 'c1', serviceTypeId: 'st1' },
      { clientId: 'c1', serviceTypeId: 'st1', disabledStageTemplateIds: ['s1'] },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/clients/clients.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — `Cannot find module './clients.service.js'`

- [ ] **Step 5: Write the service**

```typescript
// backend/src/clients/clients.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema.js';
import {
  ClientServiceOverride,
  ClientServiceOverrideDocument,
} from './schemas/client-service-override.schema.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private readonly clientModel: Model<Client>,
    @InjectModel(ClientServiceOverride.name)
    private readonly overrideModel: Model<ClientServiceOverride>,
    private readonly stageTemplatesService: StageTemplatesService,
  ) {}

  create(dto: CreateClientDto) {
    return this.clientModel.create({ name: dto.name });
  }

  findAll(): Promise<ClientDocument[]> {
    return this.clientModel.find() as Promise<ClientDocument[]>;
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientDocument> {
    const updated = (await this.clientModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as ClientDocument | null;
    if (!updated) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    return updated;
  }

  async assertActive(id: string): Promise<ClientDocument> {
    const client = (await this.clientModel.findById(id)) as ClientDocument | null;
    if (!client || !client.active) {
      throw new BadRequestException(`Client ${id} not found or inactive`);
    }
    return client;
  }

  async getDisabledStageTemplateIds(clientId: string, serviceTypeId: string): Promise<string[]> {
    const override = await this.overrideModel.findOne({ clientId, serviceTypeId }).lean();
    return override ? override.disabledStageTemplateIds.map((id) => id.toString()) : [];
  }

  async setDisabledStages(
    clientId: string,
    serviceTypeId: string,
    disabledStageTemplateIds: string[],
  ): Promise<ClientServiceOverrideDocument> {
    await this.assertActive(clientId);
    const templates = await this.stageTemplatesService.findAllForServiceType(serviceTypeId);
    const validIds = new Set(templates.map((t) => t._id.toString()));
    const invalid = disabledStageTemplateIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid stage template ids for this service type: ${invalid.join(', ')}`,
      );
    }

    return this.overrideModel.findOneAndUpdate(
      { clientId, serviceTypeId },
      { clientId, serviceTypeId, disabledStageTemplateIds },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ) as Promise<ClientServiceOverrideDocument>;
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/clients/clients.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (5 tests)

- [ ] **Step 7: Write the controller**

```typescript
// backend/src/clients/clients.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { UpdateClientOverrideDto } from './dto/update-client-override.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Get(':id/overrides/:serviceTypeId')
  async getOverride(@Param('id') id: string, @Param('serviceTypeId') serviceTypeId: string) {
    const disabledStageTemplateIds = await this.clientsService.getDisabledStageTemplateIds(
      id,
      serviceTypeId,
    );
    return { disabledStageTemplateIds };
  }

  @Roles('admin')
  @Put(':id/overrides/:serviceTypeId')
  setOverride(
    @Param('id') id: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @Body() dto: UpdateClientOverrideDto,
  ) {
    return this.clientsService.setDisabledStages(id, serviceTypeId, dto.disabledStageTemplateIds);
  }
}
```

- [ ] **Step 8: Write the module**

```typescript
// backend/src/clients/clients.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsService } from './clients.service.js';
import { ClientsController } from './clients.controller.js';
import { Client, ClientSchema } from './schemas/client.schema.js';
import {
  ClientServiceOverride,
  ClientServiceOverrideSchema,
} from './schemas/client-service-override.schema.js';
import { StageTemplatesModule } from '../stage-templates/stage-templates.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: ClientServiceOverride.name, schema: ClientServiceOverrideSchema },
    ]),
    StageTemplatesModule,
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
```

- [ ] **Step 9: Wire it into `AppModule`**

Modify `backend/src/app.module.ts`: import `ClientsModule` from
`./clients/clients.module.js` and add it to `imports`.

- [ ] **Step 10: Write the failing e2e test**

```typescript
// backend/test/clients.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Clients (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;
  let serviceTypeId: string;
  let stageId: string;
  let clientId: string;

  beforeAll(async () => {
    ({ stop: stopDb } = await startTestDb());
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' });
    token = login.body.accessToken;

    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Social Media' });
    serviceTypeId = serviceType.body._id;

    const stage = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1 });
    stageId = stage.body._id;

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Upper GR' });
    clientId = client.body._id;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('starts with no disabled stages, then persists an override', async () => {
    const empty = await request(app.getHttpServer())
      .get(`/clients/${clientId}/overrides/${serviceTypeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body.disabledStageTemplateIds).toEqual([]);

    await request(app.getHttpServer())
      .put(`/clients/${clientId}/overrides/${serviceTypeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ disabledStageTemplateIds: [stageId] })
      .expect(200);

    const stored = await request(app.getHttpServer())
      .get(`/clients/${clientId}/overrides/${serviceTypeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(stored.body.disabledStageTemplateIds).toEqual([stageId]);
  });

  it('rejects an override id that does not belong to the service type', async () => {
    await request(app.getHttpServer())
      .put(`/clients/${clientId}/overrides/${serviceTypeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ disabledStageTemplateIds: ['605c5f3f4f1a2c001f9c8a11'] })
      .expect(400);
  });
});
```

- [ ] **Step 11: Run the e2e test and confirm it passes**

Run: `npx vitest run test/clients.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add backend/src/clients backend/src/app.module.ts backend/test/clients.e2e-spec.ts
git commit -m "feat(backend): add Client module with per-service-type stage overrides"
```

---

## Task 5: Add `setor` to User (backend)

**Files:**
- Modify: `backend/src/users/schemas/user.schema.ts`
- Modify: `backend/src/users/dto/create-user.dto.ts`
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.service.spec.ts`

**Interfaces:**
- Consumes: `SECTORS`/`Sector` from `../common/sector.js` (Task 1).
- Produces: `User.setor?: Sector` — no other task consumes this
  directly; it's read-model-only for this plan (Task 12 frontend page
  will optionally show it, but no backend logic branches on it yet).

- [ ] **Step 1: Read the current test file to see the existing assertions**

Read `backend/src/users/users.service.spec.ts` — the `create` test
currently asserts the exact object passed to `userModel.create`, so it
must be updated in the same step as the service change (not a
separate before/after).

- [ ] **Step 2: Update the schema**

In `backend/src/users/schemas/user.schema.ts`, add the import
`import { SECTORS, Sector } from '../../common/sector.js';` and add
this property to the `User` class (after `role`):

```typescript
  @Prop({ type: String, enum: SECTORS })
  setor?: Sector;
```

- [ ] **Step 3: Update the create DTO**

In `backend/src/users/dto/create-user.dto.ts`, add the import
`import { SECTORS, Sector } from '../../common/sector.js';` and add:

```typescript
  @IsOptional()
  @IsIn(SECTORS)
  setor?: Sector;
```

- [ ] **Step 4: Update the service**

In `backend/src/users/users.service.ts`, change the `create` method's
`userModel.create` call to include `setor: dto.setor`:

```typescript
  async create(dto: CreateUserDto): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.userModel.create({
      name: dto.name,
      email: dto.email,
      role: dto.role ?? 'member',
      setor: dto.setor,
      passwordHash,
    });
  }
```

- [ ] **Step 5: Update the existing unit test's assertion**

Read `backend/src/users/users.service.spec.ts` first to get its exact
current content, then update the object passed to
`expect(modelMock.create).toHaveBeenCalledWith(...)` (if that
assertion exists) to include `setor: undefined`. If the existing test
only checks `passwordHash`/`email` fields loosely, no change is
needed — verify by running the tests in the next step.

- [ ] **Step 6: Run the unit tests**

Run: `npx vitest run src/users/users.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS. If it fails on an exact-object assertion, add
`setor: undefined` to the expected object and rerun.

- [ ] **Step 7: Run the full unit + e2e suite to catch regressions**

Run: `npm run test --prefix backend && npm run test:e2e --prefix backend`
Expected: PASS (existing users e2e test creates a user without `setor`,
which stays valid since the field is optional).

- [ ] **Step 8: Commit**

```bash
git add backend/src/users/schemas/user.schema.ts backend/src/users/dto/create-user.dto.ts backend/src/users/users.service.ts backend/src/users/users.service.spec.ts
git commit -m "feat(backend): add optional setor field to User"
```

---

## Task 6: Add `setor`/`sourceStageTemplateId` to Task + `generateFromTemplate` (backend)

**Files:**
- Modify: `backend/src/tasks/schemas/task.schema.ts`
- Modify: `backend/src/tasks/tasks.service.ts`
- Modify: `backend/src/tasks/tasks.module.ts`
- Modify: `backend/src/tasks/tasks.service.spec.ts`

**Interfaces:**
- Consumes: `SECTORS`/`Sector` from `../common/sector.js` (Task 1).
- Produces: `TaskDocument.setor?: Sector`,
  `TaskDocument.sourceStageTemplateId?: Types.ObjectId`;
  `TasksService.generateFromTemplate(projectId: string, startDate: string, stageTemplates: StageTemplateInput[]): Promise<TaskDocument[]>`
  where
  `StageTemplateInput = { id: string; name: string; defaultSector: Sector; defaultDurationDays: number }`
  — consumed by Task 8's `ProjectsService.create()`. `TasksModule` now
  exports `TasksService`.

- [ ] **Step 1: Update the schema**

In `backend/src/tasks/schemas/task.schema.ts`, add the import
`import { SECTORS, Sector } from '../../common/sector.js';` and add
these two properties to the `Task` class (after `status`):

```typescript
  @Prop({ type: String, enum: SECTORS })
  setor?: Sector;

  @Prop({ type: Types.ObjectId, ref: 'StageTemplate' })
  sourceStageTemplateId?: Types.ObjectId;
```

- [ ] **Step 2: Write the failing unit test for `generateFromTemplate`**

Append to `backend/src/tasks/tasks.service.spec.ts` (inside the
existing `describe('TasksService', ...)` block, after the existing
`it(...)`):

```typescript
  it('generates chained tasks from stage templates starting on the given date', async () => {
    modelMock.create
      .mockResolvedValueOnce({ _id: 'task-1', name: 'Briefing' })
      .mockResolvedValueOnce({ _id: 'task-2', name: 'Cronograma' });

    const stages = [
      { id: 'stage-1', name: 'Briefing', defaultSector: 'diretoria_criacao' as const, defaultDurationDays: 2 },
      { id: 'stage-2', name: 'Cronograma', defaultSector: 'criacao' as const, defaultDurationDays: 3 },
    ];

    const created = await service.generateFromTemplate('project-1', '2026-01-01', stages);

    expect(modelMock.create).toHaveBeenNthCalledWith(1, {
      name: 'Briefing',
      projectId: 'project-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
      setor: 'diretoria_criacao',
      sourceStageTemplateId: 'stage-1',
      dependencies: [],
    });
    expect(modelMock.create).toHaveBeenNthCalledWith(2, {
      name: 'Cronograma',
      projectId: 'project-1',
      startDate: new Date('2026-01-03'),
      endDate: new Date('2026-01-05'),
      setor: 'criacao',
      sourceStageTemplateId: 'stage-2',
      dependencies: ['task-1'],
    });
    expect(created).toHaveLength(2);
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/tasks/tasks.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — `service.generateFromTemplate is not a function`

- [ ] **Step 4: Implement `generateFromTemplate`**

In `backend/src/tasks/tasks.service.ts`, add the import
`import { Sector } from '../common/sector.js';` and add this
interface and method to the `TasksService` class:

```typescript
export interface StageTemplateInput {
  id: string;
  name: string;
  defaultSector: Sector;
  defaultDurationDays: number;
}
```

(place this `export interface` above the `@Injectable()` class, after
the existing imports)

```typescript
  async generateFromTemplate(
    projectId: string,
    startDate: string,
    stageTemplates: StageTemplateInput[],
  ): Promise<TaskDocument[]> {
    const created: TaskDocument[] = [];
    let cursor = new Date(startDate);
    let previousTaskId: string | undefined;

    for (const stage of stageTemplates) {
      const stageStart = new Date(cursor);
      const stageEnd = new Date(cursor);
      stageEnd.setDate(stageEnd.getDate() + stage.defaultDurationDays - 1);

      const task = (await this.taskModel.create({
        name: stage.name,
        projectId,
        startDate: stageStart,
        endDate: stageEnd,
        setor: stage.defaultSector,
        sourceStageTemplateId: stage.id,
        dependencies: previousTaskId ? [previousTaskId] : [],
      })) as TaskDocument;

      created.push(task);
      previousTaskId = task._id.toString();
      cursor = new Date(stageEnd);
      cursor.setDate(cursor.getDate() + 1);
    }

    return created;
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/tasks/tasks.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (2 tests)

- [ ] **Step 6: Export `TasksService` from `TasksModule`**

In `backend/src/tasks/tasks.module.ts`, add `exports: [TasksService],`
to the `@Module` decorator (alongside `providers`/`controllers`).

- [ ] **Step 7: Commit**

```bash
git add backend/src/tasks/schemas/task.schema.ts backend/src/tasks/tasks.service.ts backend/src/tasks/tasks.module.ts backend/src/tasks/tasks.service.spec.ts
git commit -m "feat(backend): add setor to Task and generateFromTemplate"
```

---

## Task 7: Add `clientId`/`serviceTypeId`/`startDate` to Project + wire generation into `ProjectsService.create()` (backend)

**Files:**
- Modify: `backend/src/projects/schemas/project.schema.ts`
- Modify: `backend/src/projects/dto/create-project.dto.ts`
- Modify: `backend/src/projects/projects.service.ts`
- Modify: `backend/src/projects/projects.module.ts`
- Modify: `backend/src/projects/projects.service.spec.ts`
- Modify: `backend/test/projects.e2e-spec.ts`
- Modify: `backend/test/tasks.e2e-spec.ts`
- Create: `backend/test/project-template-generation.e2e-spec.ts`

**Interfaces:**
- Consumes: `ClientsService.assertActive`,
  `ClientsService.getDisabledStageTemplateIds` (Task 4);
  `ServiceTypesService.assertActive` (Task 2);
  `StageTemplatesService.findAllForServiceType` (Task 3);
  `TasksService.generateFromTemplate` (Task 6).
- Produces: `ProjectDocument.clientId`, `.serviceTypeId`, `.startDate`;
  `ProjectsService.create(dto, createdBy)` now returns a project whose
  tasks already exist in the DB (no new return shape — still
  `ProjectDocument`, tasks are fetched separately via the existing
  `GET /projects/:id/tasks`).

- [ ] **Step 1: Update the schema**

In `backend/src/projects/schemas/project.schema.ts`, add these
properties to the `Project` class (after `description`):

```typescript
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;
```

- [ ] **Step 2: Update the create DTO**

Replace the contents of `backend/src/projects/dto/create-project.dto.ts`:

```typescript
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  clientId: string;

  @IsString()
  serviceTypeId: string;

  @IsDateString()
  startDate: string;
}
```

- [ ] **Step 3: Read the existing `ProjectsService` unit test**

Read `backend/src/projects/projects.service.spec.ts` in full — its
`create` test asserts the exact object passed to `projectModel.create`
and will need updating alongside the service change; its
`findOne`-throws test is unaffected.

- [ ] **Step 4: Write the failing unit test for template generation**

Replace `backend/src/projects/projects.service.spec.ts` with:

```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { Project } from './schemas/project.schema.js';
import { ClientsService } from '../clients/clients.service.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';
import { TasksService } from '../tasks/tasks.service.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };
  const clientsServiceMock = {
    assertActive: vi.fn(),
    getDisabledStageTemplateIds: vi.fn(),
  };
  const serviceTypesServiceMock = { assertActive: vi.fn() };
  const stageTemplatesServiceMock = { findAllForServiceType: vi.fn() };
  const tasksServiceMock = { generateFromTemplate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: modelMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
        { provide: StageTemplatesService, useValue: stageTemplatesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  it('creates a project and generates tasks from the active, non-disabled stages', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
      { _id: { toString: () => 's2' }, name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1 },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue(['s2']);

    await service.create(
      { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
      'user-1',
    );

    expect(tasksServiceMock.generateFromTemplate).toHaveBeenCalledWith('p1', '2026-01-01', [
      { id: 's1', name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
    ]);
  });

  it('skips task generation and does not error when every stage is disabled', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue(['s1']);

    await service.create(
      { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
      'user-1',
    );

    expect(tasksServiceMock.generateFromTemplate).not.toHaveBeenCalled();
  });

  it('rolls back the project when task generation fails', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue([]);
    tasksServiceMock.generateFromTemplate.mockRejectedValue(new Error('boom'));

    await expect(
      service.create(
        { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
        'user-1',
      ),
    ).rejects.toThrow('boom');
    expect(modelMock.findByIdAndDelete).toHaveBeenCalledWith('p1');
  });

  it('throws NotFoundException when the project does not exist', async () => {
    modelMock.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/projects/projects.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — constructor now expects 5 providers, or `create`
throws because the mocked dependencies aren't wired into the service
yet.

- [ ] **Step 6: Update `ProjectsService`**

Replace the contents of `backend/src/projects/projects.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ClientsService } from '../clients/clients.service.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';
import { TasksService } from '../tasks/tasks.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly clientsService: ClientsService,
    private readonly serviceTypesService: ServiceTypesService,
    private readonly stageTemplatesService: StageTemplatesService,
    private readonly tasksService: TasksService,
  ) {}

  async create(dto: CreateProjectDto, createdBy: string): Promise<ProjectDocument> {
    await this.clientsService.assertActive(dto.clientId);
    await this.serviceTypesService.assertActive(dto.serviceTypeId);

    const project = (await this.projectModel.create({
      name: dto.name,
      description: dto.description,
      clientId: dto.clientId,
      serviceTypeId: dto.serviceTypeId,
      startDate: dto.startDate,
      createdBy,
    })) as ProjectDocument;

    try {
      const stageTemplates = await this.stageTemplatesService.findAllForServiceType(
        dto.serviceTypeId,
      );
      const disabledIds = await this.clientsService.getDisabledStageTemplateIds(
        dto.clientId,
        dto.serviceTypeId,
      );
      const activeStages = stageTemplates
        .filter((stage) => !disabledIds.includes(stage._id.toString()))
        .map((stage) => ({
          id: stage._id.toString(),
          name: stage.name,
          defaultSector: stage.defaultSector,
          defaultDurationDays: stage.defaultDurationDays,
        }));

      if (activeStages.length > 0) {
        await this.tasksService.generateFromTemplate(
          project._id.toString(),
          dto.startDate,
          activeStages,
        );
      }
    } catch (err) {
      await this.projectModel.findByIdAndDelete(project._id);
      throw err;
    }

    return project;
  }

  findAll(): Promise<ProjectDocument[]> {
    return this.projectModel.find() as Promise<ProjectDocument[]>;
  }

  async findOne(id: string): Promise<ProjectDocument> {
    const project = (await this.projectModel.findById(id)) as ProjectDocument | null;
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectDocument> {
    const project = (await this.projectModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as ProjectDocument | null;
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/projects/projects.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (4 tests)

- [ ] **Step 8: Update `ProjectsModule`**

Replace the contents of `backend/src/projects/projects.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { Project, ProjectSchema } from './schemas/project.schema.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';
import { StageTemplatesModule } from '../stage-templates/stage-templates.module.js';
import { TasksModule } from '../tasks/tasks.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    ClientsModule,
    ServiceTypesModule,
    StageTemplatesModule,
    TasksModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

- [ ] **Step 9: Update the existing `projects.e2e-spec.ts` to send the new required fields**

In `backend/test/projects.e2e-spec.ts`, the `beforeEach` needs a client
and service type before the existing test can create a project. Add
this after the login block inside `beforeEach` (right after
`token = login.body.accessToken;`):

```typescript
    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Teste' });
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Site' });
```

and store `clientId`/`serviceTypeId` as `let` variables declared
alongside `token` at the top of the `describe` block (`let clientId:
string; let serviceTypeId: string;`), assigning them from
`client.body._id` / `serviceType.body._id`. Then update the existing
`.send({ name: 'Campanha X', description: 'Lançamento Q4' })` call to:

```typescript
      .send({
        name: 'Campanha X',
        description: 'Lançamento Q4',
        clientId,
        serviceTypeId,
        startDate: '2026-01-01',
      })
```

- [ ] **Step 10: Update `tasks.e2e-spec.ts` the same way**

In `backend/test/tasks.e2e-spec.ts`, apply the identical change: create
a client + service type in `beforeEach` after login, and add
`clientId, serviceTypeId, startDate: '2026-01-01'` to the
`.send({ name: 'Campanha X' })` call that creates the project. Since
this service type has no stage templates yet, project creation still
produces zero auto-generated tasks — the test's manual
`POST /projects/:id/tasks` calls continue to work unchanged.

- [ ] **Step 11: Run the full e2e suite**

Run: `npm run test:e2e --prefix backend`
Expected: PASS — all existing suites (`projects`, `tasks`, `users`,
`auth`, `service-types`, `stage-templates`, `clients`) green.

- [ ] **Step 12: Write the failing e2e test for end-to-end template generation**

```typescript
// backend/test/project-template-generation.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Project creation generates tasks from template (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;

  beforeAll(async () => {
    ({ stop: stopDb } = await startTestDb());
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' });
    token = login.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('creates chained tasks for the active stages, skipping the client-disabled one', async () => {
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Social Media' });
    const serviceTypeId = serviceType.body._id;

    const stage1 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Briefing', defaultSector: 'diretoria_criacao', defaultDurationDays: 2 });
    const stage2 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1 });

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Upper GR' });
    const clientId = client.body._id;

    await request(app.getHttpServer())
      .put(`/clients/${clientId}/overrides/${serviceTypeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ disabledStageTemplateIds: [stage2.body._id] })
      .expect(200);

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Campanha Upper',
        clientId,
        serviceTypeId,
        startDate: '2026-01-01',
      })
      .expect(201);

    const tasks = await request(app.getHttpServer())
      .get(`/projects/${project.body._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0].name).toBe('Briefing');
    expect(tasks.body[0].startDate.slice(0, 10)).toBe('2026-01-01');
    expect(tasks.body[0].endDate.slice(0, 10)).toBe('2026-01-02');
    expect(tasks.body[0].dependencies).toEqual([]);
  });

  it('rejects project creation with an inactive client', async () => {
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Site' });

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Inativo' });
    await request(app.getHttpServer())
      .patch(`/clients/${client.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false });

    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Campanha X',
        clientId: client.body._id,
        serviceTypeId: serviceType.body._id,
        startDate: '2026-01-01',
      })
      .expect(400);
  });
});
```

- [ ] **Step 13: Run the new e2e test and confirm it passes**

Run: `npx vitest run test/project-template-generation.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS

- [ ] **Step 14: Run the entire backend test suite one more time**

Run: `npm run test --prefix backend && npm run test:e2e --prefix backend`
Expected: PASS, all green.

- [ ] **Step 15: Commit**

```bash
git add backend/src/projects backend/test/projects.e2e-spec.ts backend/test/tasks.e2e-spec.ts backend/test/project-template-generation.e2e-spec.ts
git commit -m "feat(backend): generate project tasks from service-type template on creation"
```

---

## Task 8: Frontend types + API clients for ServiceType/StageTemplate/Client

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/api/serviceTypes.ts`
- Create: `frontend/src/api/stageTemplates.ts`
- Create: `frontend/src/api/clients.ts`
- Modify: `frontend/src/api/projects.ts`

**Interfaces:**
- Produces: `Sector`, `SECTORS`, `SECTOR_LABELS`, `ServiceType`,
  `StageTemplate`, `Client` types; `listServiceTypes`,
  `createServiceType`, `updateServiceType`; `listStageTemplates`,
  `createStageTemplate`, `updateStageTemplate`, `deleteStageTemplate`,
  `reorderStageTemplates`; `listClients`, `createClient`,
  `updateClient`, `getClientOverride`, `setClientOverride`;
  `createProject` now requires `clientId`/`serviceTypeId`/`startDate`
  — consumed by Tasks 9-12.

- [ ] **Step 1: Update `types.ts`**

In `frontend/src/types.ts`, add near the top (after `export type
Role = 'admin' | 'member';`):

```typescript
export const SECTORS = [
  'diretoria',
  'diretoria_executiva',
  'diretoria_criacao',
  'criacao',
  'desenvolvimento',
] as const;

export type Sector = (typeof SECTORS)[number];

export const SECTOR_LABELS: Record<Sector, string> = {
  diretoria: 'Diretoria',
  diretoria_executiva: 'Diretoria Executiva',
  diretoria_criacao: 'Diretoria de Criação',
  criacao: 'Criação',
  desenvolvimento: 'Desenvolvimento',
};

export interface ServiceType {
  _id: string;
  name: string;
  active: boolean;
}

export interface StageTemplate {
  _id: string;
  serviceTypeId: string;
  order: number;
  name: string;
  defaultSector: Sector;
  defaultDurationDays: number;
}

export interface Client {
  _id: string;
  name: string;
  active: boolean;
}
```

Then update the `User` interface to add `setor?: Sector;` after
`role: Role;`, the `Project` interface to add `clientId: string;
serviceTypeId: string; startDate: string;` after `description?:
string;`, and the `Task` interface to add `setor?: Sector;
sourceStageTemplateId?: string;` after `status: TaskStatus;`.

- [ ] **Step 2: Create `api/serviceTypes.ts`**

```typescript
// frontend/src/api/serviceTypes.ts
import { apiClient } from './client.js';
import type { ServiceType } from '../types.js';

export function listServiceTypes() {
  return apiClient.get<ServiceType[]>('/service-types').then((res) => res.data);
}

export function createServiceType(dto: { name: string }) {
  return apiClient.post<ServiceType>('/service-types', dto).then((res) => res.data);
}

export function updateServiceType(id: string, dto: { name?: string; active?: boolean }) {
  return apiClient.patch<ServiceType>(`/service-types/${id}`, dto).then((res) => res.data);
}
```

- [ ] **Step 3: Create `api/stageTemplates.ts`**

```typescript
// frontend/src/api/stageTemplates.ts
import { apiClient } from './client.js';
import type { Sector, StageTemplate } from '../types.js';

export function listStageTemplates(serviceTypeId: string) {
  return apiClient
    .get<StageTemplate[]>(`/service-types/${serviceTypeId}/stage-templates`)
    .then((res) => res.data);
}

export function createStageTemplate(
  serviceTypeId: string,
  dto: { name: string; defaultSector: Sector; defaultDurationDays: number },
) {
  return apiClient
    .post<StageTemplate>(`/service-types/${serviceTypeId}/stage-templates`, dto)
    .then((res) => res.data);
}

export function updateStageTemplate(
  id: string,
  dto: { name?: string; defaultSector?: Sector; defaultDurationDays?: number },
) {
  return apiClient.patch<StageTemplate>(`/stage-templates/${id}`, dto).then((res) => res.data);
}

export function deleteStageTemplate(id: string) {
  return apiClient.delete(`/stage-templates/${id}`);
}

export function reorderStageTemplates(serviceTypeId: string, orderedIds: string[]) {
  return apiClient
    .put<StageTemplate[]>(`/service-types/${serviceTypeId}/stage-templates/reorder`, {
      orderedIds,
    })
    .then((res) => res.data);
}
```

- [ ] **Step 4: Create `api/clients.ts`**

```typescript
// frontend/src/api/clients.ts
import { apiClient } from './client.js';
import type { Client } from '../types.js';

export function listClients() {
  return apiClient.get<Client[]>('/clients').then((res) => res.data);
}

export function createClient(dto: { name: string }) {
  return apiClient.post<Client>('/clients', dto).then((res) => res.data);
}

export function updateClient(id: string, dto: { name?: string; active?: boolean }) {
  return apiClient.patch<Client>(`/clients/${id}`, dto).then((res) => res.data);
}

export function getClientOverride(clientId: string, serviceTypeId: string) {
  return apiClient
    .get<{ disabledStageTemplateIds: string[] }>(`/clients/${clientId}/overrides/${serviceTypeId}`)
    .then((res) => res.data.disabledStageTemplateIds);
}

export function setClientOverride(
  clientId: string,
  serviceTypeId: string,
  disabledStageTemplateIds: string[],
) {
  return apiClient
    .put(`/clients/${clientId}/overrides/${serviceTypeId}`, { disabledStageTemplateIds })
    .then((res) => res.data);
}
```

- [ ] **Step 5: Update `api/projects.ts`**

Replace the `createProject` function in `frontend/src/api/projects.ts`:

```typescript
export function createProject(dto: {
  name: string;
  description?: string;
  clientId: string;
  serviceTypeId: string;
  startDate: string;
}) {
  return apiClient.post<Project>('/projects', dto).then((res) => res.data);
}
```

- [ ] **Step 6: Type-check the frontend**

Run: `npm run build --prefix frontend`
Expected: fails only on `CreateProjectModal.tsx`/`DashboardPage.tsx`
call sites that still call `createProject` with the old shorter shape
— that's expected and fixed in Task 12. If it fails anywhere else,
fix the reported type error before continuing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/serviceTypes.ts frontend/src/api/stageTemplates.ts frontend/src/api/clients.ts frontend/src/api/projects.ts
git commit -m "feat(frontend): add types and API clients for service types, stage templates and clients"
```

---

## Task 9: ServiceTypes admin page

**Files:**
- Create: `frontend/src/components/CreateServiceTypeModal.tsx`
- Create: `frontend/src/pages/ServiceTypesPage.tsx`
- Create: `frontend/src/pages/ServiceTypesPage.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

**Interfaces:**
- Consumes: `listServiceTypes`, `createServiceType`, `updateServiceType`
  from `../api/serviceTypes.js` (Task 8); `useAuth()` for role gating
  (existing).
- Produces: route `/tipos-servico`; navigating to a service type row
  goes to `/tipos-servico/:serviceTypeId/etapas` (built in Task 10).

- [ ] **Step 1: Write the failing component test**

```typescript
// frontend/src/pages/ServiceTypesPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ServiceTypesPage } from './ServiceTypesPage.js';
import * as serviceTypesApi from '../api/serviceTypes.js';
import type { ServiceType } from '../types.js';

const serviceTypes: ServiceType[] = [{ _id: 'st1', name: 'Social Media', active: true }];

describe('ServiceTypesPage', () => {
  it('lists service types and creates a new one', async () => {
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue(serviceTypes);
    vi.spyOn(serviceTypesApi, 'createServiceType').mockResolvedValue({
      _id: 'st2',
      name: 'Site',
      active: true,
    });

    render(
      <MemoryRouter>
        <ServiceTypesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Social Media')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /novo tipo de serviço/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Site');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(serviceTypesApi.createServiceType).toHaveBeenCalledWith({ name: 'Site' }),
    );
  });

  it('toggles a service type active state', async () => {
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue(serviceTypes);
    vi.spyOn(serviceTypesApi, 'updateServiceType').mockResolvedValue({
      _id: 'st1',
      name: 'Social Media',
      active: false,
    });

    render(
      <MemoryRouter>
        <ServiceTypesPage />
      </MemoryRouter>,
    );
    await screen.findByText('Social Media');

    await userEvent.click(screen.getByRole('button', { name: /desativar/i }));

    await waitFor(() =>
      expect(serviceTypesApi.updateServiceType).toHaveBeenCalledWith('st1', { active: false }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/ServiceTypesPage.test.tsx` (from `frontend/`)
Expected: FAIL — `Cannot find module './ServiceTypesPage.js'`

- [ ] **Step 3: Write `CreateServiceTypeModal.tsx`**

```typescript
// frontend/src/components/CreateServiceTypeModal.tsx
import { useState, type FormEvent } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string }) => void;
}

export function CreateServiceTypeModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo tipo de serviço</h2>
        <div>
          <label htmlFor="service-type-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="service-type-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Write `ServiceTypesPage.tsx`**

```typescript
// frontend/src/pages/ServiceTypesPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listServiceTypes, createServiceType, updateServiceType } from '../api/serviceTypes.js';
import { CreateServiceTypeModal } from '../components/CreateServiceTypeModal.js';
import type { ServiceType } from '../types.js';

export function ServiceTypesPage() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listServiceTypes().then(setServiceTypes);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string }) {
    await createServiceType(dto);
    setShowModal(false);
    refresh();
  }

  async function handleToggleActive(serviceType: ServiceType) {
    await updateServiceType(serviceType._id, { active: !serviceType.active });
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Tipos de serviço</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo tipo de serviço
        </button>
      </div>

      <ul className="space-y-3">
        {serviceTypes.map((serviceType) => (
          <li
            key={serviceType._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link
              to={`/tipos-servico/${serviceType._id}/etapas`}
              className="font-medium text-[#E0176A] hover:underline"
            >
              {serviceType.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">
                {serviceType.active ? 'ativo' : 'inativo'}
              </span>
              <button
                onClick={() => handleToggleActive(serviceType)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {serviceType.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <CreateServiceTypeModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/pages/ServiceTypesPage.test.tsx` (from `frontend/`)
Expected: PASS (2 tests)

- [ ] **Step 6: Wire the route into `App.tsx`**

In `frontend/src/App.tsx`, add
`import { ServiceTypesPage } from './pages/ServiceTypesPage.js';` and
add `<Route path="/tipos-servico" element={<ServiceTypesPage />} />`
inside the `<Route element={<AppLayout />}>` block, next to
`/usuarios`.

- [ ] **Step 7: Add the sidebar nav item**

In `frontend/src/layouts/AppLayout.tsx`, inside the `{role === 'admin'
&& (...)}` block, add a second `NavLink` right after the existing
`Usuários` one:

```typescript
              <NavLink to="/tipos-servico" className={navItemClass}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Tipos de Serviço
              </NavLink>
```

- [ ] **Step 8: Run the frontend test suite**

Run: `npm test --prefix frontend`
Expected: PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/CreateServiceTypeModal.tsx frontend/src/pages/ServiceTypesPage.tsx frontend/src/pages/ServiceTypesPage.test.tsx frontend/src/App.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "feat(frontend): add ServiceTypes admin page"
```

---

## Task 10: StageTemplates admin page (the template editor)

**Files:**
- Create: `frontend/src/components/StageTemplateModal.tsx`
- Create: `frontend/src/pages/StageTemplatesPage.tsx`
- Create: `frontend/src/pages/StageTemplatesPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `listStageTemplates`, `createStageTemplate`,
  `updateStageTemplate`, `deleteStageTemplate`,
  `reorderStageTemplates` from `../api/stageTemplates.js` (Task 8);
  `SECTORS`, `SECTOR_LABELS` from `../types.js`.
- Produces: route `/tipos-servico/:serviceTypeId/etapas` — this is the
  concrete "menu com template padrão das tarefas" the user asked for.

- [ ] **Step 1: Write the failing component test**

```typescript
// frontend/src/pages/StageTemplatesPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { StageTemplatesPage } from './StageTemplatesPage.js';
import * as stageTemplatesApi from '../api/stageTemplates.js';
import type { StageTemplate } from '../types.js';

const stages: StageTemplate[] = [
  {
    _id: 's1',
    serviceTypeId: 'st1',
    order: 0,
    name: 'Briefing',
    defaultSector: 'diretoria_criacao',
    defaultDurationDays: 2,
  },
  {
    _id: 's2',
    serviceTypeId: 'st1',
    order: 1,
    name: 'Facebook',
    defaultSector: 'criacao',
    defaultDurationDays: 1,
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tipos-servico/st1/etapas']}>
      <Routes>
        <Route path="/tipos-servico/:serviceTypeId/etapas" element={<StageTemplatesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StageTemplatesPage', () => {
  it('lists stages in order and creates a new one', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(stageTemplatesApi, 'createStageTemplate').mockResolvedValue({
      _id: 's3',
      serviceTypeId: 'st1',
      order: 2,
      name: 'LinkedIn',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
    });

    renderPage();

    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Briefing');
    expect(items[1]).toHaveTextContent('Facebook');

    await userEvent.click(screen.getByRole('button', { name: /nova etapa/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'LinkedIn');
    await userEvent.selectOptions(screen.getByLabelText(/setor/i), 'criacao');
    await userEvent.type(screen.getByLabelText(/duração/i), '1');
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(stageTemplatesApi.createStageTemplate).toHaveBeenCalledWith('st1', {
        name: 'LinkedIn',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
      }),
    );
  });

  it('moves a stage down via the reorder button', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(stageTemplatesApi, 'reorderStageTemplates').mockResolvedValue([stages[1], stages[0]]);

    renderPage();
    await screen.findByText('Briefing');

    const downButtons = screen.getAllByRole('button', { name: /mover para baixo/i });
    await userEvent.click(downButtons[0]);

    await waitFor(() =>
      expect(stageTemplatesApi.reorderStageTemplates).toHaveBeenCalledWith('st1', ['s2', 's1']),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/StageTemplatesPage.test.tsx` (from `frontend/`)
Expected: FAIL — `Cannot find module './StageTemplatesPage.js'`

- [ ] **Step 3: Write `StageTemplateModal.tsx`**

```typescript
// frontend/src/components/StageTemplateModal.tsx
import { useState, type FormEvent } from 'react';
import { SECTORS, SECTOR_LABELS, type Sector, type StageTemplate } from '../types.js';

interface Props {
  initial?: StageTemplate;
  onClose: () => void;
  onSave: (dto: { name: string; defaultSector: Sector; defaultDurationDays: number }) => void;
}

export function StageTemplateModal({ initial, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [defaultSector, setDefaultSector] = useState<Sector>(initial?.defaultSector ?? SECTORS[0]);
  const [defaultDurationDays, setDefaultDurationDays] = useState(
    initial ? String(initial.defaultDurationDays) : '',
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, defaultSector, defaultDurationDays: Number(defaultDurationDays) });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{initial ? 'Editar etapa' : 'Nova etapa'}</h2>
        <div>
          <label htmlFor="stage-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="stage-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="stage-sector" className="block text-sm text-gray-600">
            Setor
          </label>
          <select
            id="stage-sector"
            value={defaultSector}
            onChange={(e) => setDefaultSector(e.target.value as Sector)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {SECTOR_LABELS[sector]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stage-duration" className="block text-sm text-gray-600">
            Duração (dias)
          </label>
          <input
            id="stage-duration"
            type="number"
            min={1}
            value={defaultDurationDays}
            onChange={(e) => setDefaultDurationDays(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Write `StageTemplatesPage.tsx`**

```typescript
// frontend/src/pages/StageTemplatesPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  listStageTemplates,
  createStageTemplate,
  updateStageTemplate,
  deleteStageTemplate,
  reorderStageTemplates,
} from '../api/stageTemplates.js';
import { StageTemplateModal } from '../components/StageTemplateModal.js';
import { SECTOR_LABELS, type Sector, type StageTemplate } from '../types.js';

export function StageTemplatesPage() {
  const { serviceTypeId } = useParams<{ serviceTypeId: string }>();
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [modalStage, setModalStage] = useState<StageTemplate | 'new' | null>(null);

  function refresh() {
    if (serviceTypeId) {
      listStageTemplates(serviceTypeId).then(setStages);
    }
  }

  useEffect(refresh, [serviceTypeId]);

  async function handleSave(dto: { name: string; defaultSector: Sector; defaultDurationDays: number }) {
    if (!serviceTypeId) return;
    if (modalStage && modalStage !== 'new') {
      await updateStageTemplate(modalStage._id, dto);
    } else {
      await createStageTemplate(serviceTypeId, dto);
    }
    setModalStage(null);
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteStageTemplate(id);
    refresh();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!serviceTypeId) return;
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await reorderStageTemplates(serviceTypeId, reordered.map((s) => s._id));
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Etapas do template</h1>
        <button
          onClick={() => setModalStage('new')}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Nova etapa
        </button>
      </div>

      <ul className="space-y-3">
        {stages.map((stage, index) => (
          <li
            key={stage._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-gray-800">{stage.name}</p>
              <p className="text-sm text-gray-500">
                {SECTOR_LABELS[stage.defaultSector]} · {stage.defaultDurationDays} dia(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Mover para cima"
                disabled={index === 0}
                onClick={() => handleMove(index, -1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                aria-label="Mover para baixo"
                disabled={index === stages.length - 1}
                onClick={() => handleMove(index, 1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => setModalStage(stage)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(stage._id)}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      {modalStage && (
        <StageTemplateModal
          initial={modalStage === 'new' ? undefined : modalStage}
          onClose={() => setModalStage(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/pages/StageTemplatesPage.test.tsx` (from `frontend/`)
Expected: PASS (2 tests)

- [ ] **Step 6: Wire the route into `App.tsx`**

In `frontend/src/App.tsx`, add
`import { StageTemplatesPage } from './pages/StageTemplatesPage.js';`
and add
`<Route path="/tipos-servico/:serviceTypeId/etapas" element={<StageTemplatesPage />} />`
next to the `/tipos-servico` route.

- [ ] **Step 7: Run the frontend test suite**

Run: `npm test --prefix frontend`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/StageTemplateModal.tsx frontend/src/pages/StageTemplatesPage.tsx frontend/src/pages/StageTemplatesPage.test.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add StageTemplates editor page"
```

---

## Task 11: Clients admin page (list + create)

**Files:**
- Create: `frontend/src/components/CreateClientModal.tsx`
- Create: `frontend/src/pages/ClientsPage.tsx`
- Create: `frontend/src/pages/ClientsPage.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/AppLayout.tsx`

**Interfaces:**
- Consumes: `listClients`, `createClient`, `updateClient` from
  `../api/clients.js` (Task 8).
- Produces: route `/clientes`; navigating to a client row goes to
  `/clientes/:clientId` (built in Task 12).

- [ ] **Step 1: Write the failing component test**

```typescript
// frontend/src/pages/ClientsPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ClientsPage } from './ClientsPage.js';
import * as clientsApi from '../api/clients.js';
import type { Client } from '../types.js';

const clients: Client[] = [{ _id: 'c1', name: 'Upper GR', active: true }];

describe('ClientsPage', () => {
  it('lists clients and creates a new one', async () => {
    vi.spyOn(clientsApi, 'listClients').mockResolvedValue(clients);
    vi.spyOn(clientsApi, 'createClient').mockResolvedValue({
      _id: 'c2',
      name: 'Nova Empresa',
      active: true,
    });

    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Upper GR')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Nova Empresa');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(clientsApi.createClient).toHaveBeenCalledWith({ name: 'Nova Empresa' }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/ClientsPage.test.tsx` (from `frontend/`)
Expected: FAIL — `Cannot find module './ClientsPage.js'`

- [ ] **Step 3: Write `CreateClientModal.tsx`**

```typescript
// frontend/src/components/CreateClientModal.tsx
import { useState, type FormEvent } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string }) => void;
}

export function CreateClientModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo cliente</h2>
        <div>
          <label htmlFor="client-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Write `ClientsPage.tsx`**

```typescript
// frontend/src/pages/ClientsPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClients, createClient, updateClient } from '../api/clients.js';
import { CreateClientModal } from '../components/CreateClientModal.js';
import type { Client } from '../types.js';

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listClients().then(setClients);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string }) {
    await createClient(dto);
    setShowModal(false);
    refresh();
  }

  async function handleToggleActive(client: Client) {
    await updateClient(client._id, { active: !client.active });
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo cliente
        </button>
      </div>

      <ul className="space-y-3">
        {clients.map((client) => (
          <li
            key={client._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link to={`/clientes/${client._id}`} className="font-medium text-[#E0176A] hover:underline">
              {client.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">
                {client.active ? 'ativo' : 'inativo'}
              </span>
              <button
                onClick={() => handleToggleActive(client)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {client.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showModal && <CreateClientModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/pages/ClientsPage.test.tsx` (from `frontend/`)
Expected: PASS

- [ ] **Step 6: Wire the route and sidebar nav item**

In `frontend/src/App.tsx`, add
`import { ClientsPage } from './pages/ClientsPage.js';` and
`<Route path="/clientes" element={<ClientsPage />} />` next to
`/tipos-servico`.

In `frontend/src/layouts/AppLayout.tsx`, add a third admin `NavLink`
after `Tipos de Serviço`:

```typescript
              <NavLink to="/clientes" className={navItemClass}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H2m5 0h5m0 0v-5a1 1 0 011-1h0a1 1 0 011 1v5m-3-9h.01M9 8h.01M9 12h.01M15 8h.01M15 12h.01" />
                </svg>
                Clientes
              </NavLink>
```

- [ ] **Step 7: Run the frontend test suite**

Run: `npm test --prefix frontend`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/CreateClientModal.tsx frontend/src/pages/ClientsPage.tsx frontend/src/pages/ClientsPage.test.tsx frontend/src/App.tsx frontend/src/layouts/AppLayout.tsx
git commit -m "feat(frontend): add Clients admin page"
```

---

## Task 12: Client stage-override page

**Files:**
- Create: `frontend/src/pages/ClientOverridesPage.tsx`
- Create: `frontend/src/pages/ClientOverridesPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `listServiceTypes` (Task 8), `listStageTemplates` (Task 8),
  `getClientOverride`, `setClientOverride` (Task 8).
- Produces: route `/clientes/:clientId` — this is the "cada cliente
  pode desativar etapas não necessárias" screen.

- [ ] **Step 1: Write the failing component test**

```typescript
// frontend/src/pages/ClientOverridesPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ClientOverridesPage } from './ClientOverridesPage.js';
import * as serviceTypesApi from '../api/serviceTypes.js';
import * as stageTemplatesApi from '../api/stageTemplates.js';
import * as clientsApi from '../api/clients.js';
import type { ServiceType, StageTemplate } from '../types.js';

const serviceTypes: ServiceType[] = [{ _id: 'st1', name: 'Social Media', active: true }];
const stages: StageTemplate[] = [
  {
    _id: 's1',
    serviceTypeId: 'st1',
    order: 0,
    name: 'Briefing',
    defaultSector: 'diretoria_criacao',
    defaultDurationDays: 2,
  },
  {
    _id: 's2',
    serviceTypeId: 'st1',
    order: 1,
    name: 'Facebook',
    defaultSector: 'criacao',
    defaultDurationDays: 1,
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clientes/c1']}>
      <Routes>
        <Route path="/clientes/:clientId" element={<ClientOverridesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientOverridesPage', () => {
  it('lists the stages of the selected service type and toggles one off', async () => {
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue(serviceTypes);
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(clientsApi, 'getClientOverride').mockResolvedValue([]);
    vi.spyOn(clientsApi, 'setClientOverride').mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText('Briefing')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Facebook'));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(clientsApi.setClientOverride).toHaveBeenCalledWith('c1', 'st1', ['s2']),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/ClientOverridesPage.test.tsx` (from `frontend/`)
Expected: FAIL — `Cannot find module './ClientOverridesPage.js'`

- [ ] **Step 3: Write `ClientOverridesPage.tsx`**

```typescript
// frontend/src/pages/ClientOverridesPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listServiceTypes } from '../api/serviceTypes.js';
import { listStageTemplates } from '../api/stageTemplates.js';
import { getClientOverride, setClientOverride } from '../api/clients.js';
import type { ServiceType, StageTemplate } from '../types.js';

export function ClientOverridesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listServiceTypes().then((types) => {
      const active = types.filter((t) => t.active);
      setServiceTypes(active);
      setSelectedServiceTypeId((current) => current ?? active[0]?._id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!clientId || !selectedServiceTypeId) return;
    listStageTemplates(selectedServiceTypeId).then(setStages);
    getClientOverride(clientId, selectedServiceTypeId).then((ids) => setDisabledIds(new Set(ids)));
  }, [clientId, selectedServiceTypeId]);

  function toggle(stageId: string) {
    setDisabledIds((current) => {
      const next = new Set(current);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!clientId || !selectedServiceTypeId) return;
    await setClientOverride(clientId, selectedServiceTypeId, [...disabledIds]);
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Etapas ativas do cliente</h1>

      <div className="mb-6 flex gap-2">
        {serviceTypes.map((serviceType) => (
          <button
            key={serviceType._id}
            onClick={() => setSelectedServiceTypeId(serviceType._id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              selectedServiceTypeId === serviceType._id
                ? 'bg-[#E0176A] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {serviceType.name}
          </button>
        ))}
      </div>

      <ul className="mb-6 space-y-3">
        {stages.map((stage) => (
          <li
            key={stage._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <span className="font-medium text-gray-800">{stage.name}</span>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                aria-label={stage.name}
                checked={!disabledIds.has(stage._id)}
                onChange={() => toggle(stage._id)}
              />
              Ativa
            </label>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSave}
        className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
      >
        Salvar
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/ClientOverridesPage.test.tsx` (from `frontend/`)
Expected: PASS

- [ ] **Step 5: Wire the route into `App.tsx`**

In `frontend/src/App.tsx`, add
`import { ClientOverridesPage } from './pages/ClientOverridesPage.js';`
and `<Route path="/clientes/:clientId" element={<ClientOverridesPage />} />`
next to `/clientes`.

- [ ] **Step 6: Run the frontend test suite**

Run: `npm test --prefix frontend`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ClientOverridesPage.tsx frontend/src/pages/ClientOverridesPage.test.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add per-client stage override page"
```

---

## Task 13: Wire Cliente/Tipo de Serviço/Data de início into project creation

**Files:**
- Modify: `frontend/src/components/CreateProjectModal.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `listClients` (Task 8), `listServiceTypes` (Task 8),
  updated `createProject` (Task 8).
- Produces: `CreateProjectModal` now takes `clients: Client[]` and
  `serviceTypes: ServiceType[]` props and calls `onCreate` with the
  full `{ name, description?, clientId, serviceTypeId, startDate }`
  shape.

- [ ] **Step 1: Read the current `DashboardPage.test.tsx`**

Already read above — its single test needs its `createProject`
assertion and the new required form fields added in the same edit as
the page change (not a separate red/green step, since this is a
retrofit of an existing flow rather than new behavior).

- [ ] **Step 2: Update `CreateProjectModal.tsx`**

Replace its contents:

```typescript
// frontend/src/components/CreateProjectModal.tsx
import { useState, type FormEvent } from 'react';
import type { Client, ServiceType } from '../types.js';

interface Props {
  clients: Client[];
  serviceTypes: ServiceType[];
  onClose: () => void;
  onCreate: (dto: {
    name: string;
    description?: string;
    clientId: string;
    serviceTypeId: string;
    startDate: string;
  }) => void;
}

export function CreateProjectModal({ clients, serviceTypes, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(clients[0]?._id ?? '');
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?._id ?? '');
  const [startDate, setStartDate] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      name,
      description: description || undefined,
      clientId,
      serviceTypeId,
      startDate,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo projeto</h2>
        <div>
          <label htmlFor="name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm text-gray-600">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="client" className="block text-sm text-gray-600">
            Cliente
          </label>
          <select
            id="client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          >
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="service-type" className="block text-sm text-gray-600">
            Tipo de serviço
          </label>
          <select
            id="service-type"
            value={serviceTypeId}
            onChange={(e) => setServiceTypeId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          >
            {serviceTypes.map((serviceType) => (
              <option key={serviceType._id} value={serviceType._id}>
                {serviceType.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="start-date" className="block text-sm text-gray-600">
            Data de início
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Update `DashboardPage.tsx`**

Replace its contents:

```typescript
// frontend/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, createProject, archiveProject } from '../api/projects.js';
import { listClients } from '../api/clients.js';
import { listServiceTypes } from '../api/serviceTypes.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import type { Client, Project, ServiceType } from '../types.js';

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listProjects().then(setProjects);
  }

  useEffect(refresh, []);
  useEffect(() => {
    listClients().then((all) => setClients(all.filter((c) => c.active)));
    listServiceTypes().then((all) => setServiceTypes(all.filter((s) => s.active)));
  }, []);

  async function handleCreate(dto: {
    name: string;
    description?: string;
    clientId: string;
    serviceTypeId: string;
    startDate: string;
  }) {
    await createProject(dto);
    setShowModal(false);
    refresh();
  }

  async function handleArchive(id: string) {
    await archiveProject(id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Projetos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo projeto
        </button>
      </div>

      <ul className="space-y-3">
        {projects.map((project) => (
          <li
            key={project._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link to={`/projects/${project._id}`} className="font-medium text-[#E0176A] hover:underline">
              {project.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">{project.status}</span>
              {project.status === 'active' && (
                <button onClick={() => handleArchive(project._id)} className="text-sm text-gray-500 hover:text-gray-800">
                  Arquivar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <CreateProjectModal
          clients={clients}
          serviceTypes={serviceTypes}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `DashboardPage.test.tsx`**

Replace its contents:

```typescript
// frontend/src/pages/DashboardPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from './DashboardPage.js';
import * as projectsApi from '../api/projects.js';
import * as clientsApi from '../api/clients.js';
import * as serviceTypesApi from '../api/serviceTypes.js';
import type { Project } from '../types.js';

const projects: Project[] = [
  {
    _id: '1',
    name: 'Campanha X',
    status: 'active',
    createdBy: 'admin',
    clientId: 'c1',
    serviceTypeId: 'st1',
    startDate: '2026-01-01',
  },
];

describe('DashboardPage', () => {
  it('lists projects and creates a new one', async () => {
    vi.spyOn(projectsApi, 'listProjects').mockResolvedValue(projects);
    vi.spyOn(clientsApi, 'listClients').mockResolvedValue([{ _id: 'c1', name: 'Upper GR', active: true }]);
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue([
      { _id: 'st1', name: 'Social Media', active: true },
    ]);
    vi.spyOn(projectsApi, 'createProject').mockResolvedValue({
      _id: '2',
      name: 'Nova Campanha',
      status: 'active',
      createdBy: 'admin',
      clientId: 'c1',
      serviceTypeId: 'st1',
      startDate: '2026-02-01',
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Campanha X')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /novo projeto/i }));
    await screen.findByText('Upper GR');
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'Nova Campanha');
    await userEvent.type(screen.getByLabelText(/data de início/i), '2026-02-01');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(projectsApi.createProject).toHaveBeenCalledWith({
        name: 'Nova Campanha',
        description: undefined,
        clientId: 'c1',
        serviceTypeId: 'st1',
        startDate: '2026-02-01',
      }),
    );
  });
});
```

- [ ] **Step 5: Run the frontend test suite**

Run: `npm test --prefix frontend`
Expected: PASS, all files green.

- [ ] **Step 6: Type-check and build the frontend**

Run: `npm run build --prefix frontend`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CreateProjectModal.tsx frontend/src/pages/DashboardPage.tsx frontend/src/pages/DashboardPage.test.tsx
git commit -m "feat(frontend): require client, service type and start date on project creation"
```

---

## Task 14: Full-stack verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `npm run test --prefix backend && npm run test:e2e --prefix backend`
Expected: PASS, all suites green.

- [ ] **Step 2: Run the full backend build**

Run: `npm run build --prefix backend`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm test --prefix frontend`
Expected: PASS, all suites green.

- [ ] **Step 4: Run the full frontend build**

Run: `npm run build --prefix frontend`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 5: Manual smoke test**

Start the backend (`npm run start:dev --prefix backend`, needs a
`MONGODB_URI` in `backend/.env`) and the frontend
(`npm run dev --prefix frontend`), log in as the seeded admin, and
walk through: create a Tipo de Serviço → add 3 stage templates with
different setores and durations → reorder one → create a Cliente →
open its override page and disable one stage → create a Projeto for
that cliente+tipo → open the project's Gantt and confirm the expected
tasks (minus the disabled one) appear chained by dependency with
correct dates.
