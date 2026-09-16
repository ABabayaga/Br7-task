# Template Phases + Cliente Sector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group a service type's stage templates into named, colored Phases
(purely visual/organizational, no effect on Gantt scheduling), let Phases
and StageTemplates be archived as well as deleted, add `cliente` as a
valid Sector value, and correct the PDF seed data to use it.

**Architecture:** A new sibling `PhasesModule` alongside `StageTemplatesModule`
— neither imports the other's NestJS module (avoids a circular
dependency); each registers the other's Mongoose schema directly via
`MongooseModule.forFeature` for the one cross-check/cleanup it needs
(`StageTemplatesService` validates a `phaseId` belongs to the same
`serviceTypeId`; `PhasesService` unlinks `StageTemplate.phaseId` when a
Phase is deleted). `ProjectsService.create()` gets one more filter
(`stage.active`) alongside its existing client-override filter. The
frontend's `/tipos-servico/:id/etapas` page gets a new Fases section and
its Etapas section becomes grouped by Fase.

**Tech Stack:** NestJS + Mongoose (backend), React + Vite + TypeScript +
Tailwind (frontend), Vitest everywhere.

**Spec:** `docs/superpowers/specs/2026-09-17-template-phases-design.md`

## Global Constraints

- Backend: ESM throughout — every relative import needs an explicit
  `.js` extension even though source files are `.ts`; a type used only
  as a type in a decorated field (`@Prop`/class-validator) needs
  `import type` split from the value import, or `nest build` fails with
  TS1272 (`isolatedModules` + `emitDecoratorMetadata`).
- Backend: new/changed mutating endpoints need `@Roles('admin')`; reads
  stay open to any authenticated user (existing pattern).
- Backend: reorder endpoints use the two-phase update (move every id to
  a temporary order beyond the final range, then assign final orders) —
  a single-phase update can violate the `(serviceTypeId, order)` unique
  index when two documents swap positions.
- Backend: e2e test files that create more than one `ServiceType` (or
  reuse a fixed name across multiple `it` blocks in the same file) must
  use a unique-suffixed name (`` `Site ${Date.now()}-${Math.random()}` ``)
  — `SeedServiceTemplatesService` seeds 5 fixed names
  (`Social Media`, `Logo / Identidade Visual`, `Site`,
  `Captação de Vídeo Local`, `Captação de Vídeo Externa`) on every app
  boot, and `ServiceType.name` has a unique index.
- Frontend: relative imports use explicit `.js` extensions; no new npm
  dependencies (reorder UI uses up/down buttons, not drag-and-drop).
- Phase's `startDay`/`endDay` are informational only — never read by
  `TasksService.generateFromTemplate` or `ProjectsService.create()`.

---

## Task 1: `cliente` sector + seed data correction (backend)

**Files:**
- Modify: `backend/src/common/sector.ts`
- Modify: `backend/src/service-types/seed-service-templates.service.ts`
- Modify: `backend/src/service-types/seed-service-templates.service.spec.ts`

**Interfaces:**
- Produces: `SECTORS` now includes `'cliente'` — consumed by every file
  that already imports `Sector`/`SECTORS` (no signature changes needed
  elsewhere, it's a union member addition).

- [ ] **Step 1: Add `cliente` to the shared enum**

```typescript
// backend/src/common/sector.ts
export const SECTORS = [
  'diretoria',
  'diretoria_executiva',
  'diretoria_criacao',
  'criacao',
  'desenvolvimento',
  'cliente',
] as const;

export type Sector = (typeof SECTORS)[number];
```

- [ ] **Step 2: Correct the 11 client-facing stages in the seed data**

In `backend/src/service-types/seed-service-templates.service.ts`, change
`defaultSector` from the internal-sector-by-convention value to
`'cliente'` for exactly these entries (leave every other entry
untouched):

In the `'Social Media'` seed, change:
```typescript
      { name: 'Material enviado ao cliente', defaultSector: 'diretoria_criacao' },
```
to:
```typescript
      { name: 'Material enviado ao cliente', defaultSector: 'cliente' },
```

In the `'Logo / Identidade Visual'` seed, change:
```typescript
      { name: 'Apresentação ao cliente', defaultSector: 'diretoria_criacao' },
```
to:
```typescript
      { name: 'Apresentação ao cliente', defaultSector: 'cliente' },
```

In the `'Site'` seed, change these three lines:
```typescript
      { name: 'Protótipo enviado', defaultSector: 'diretoria_executiva' },
```
to:
```typescript
      { name: 'Protótipo enviado', defaultSector: 'cliente' },
```
```typescript
      { name: 'Contrato enviado', defaultSector: 'diretoria_executiva' },
```
to:
```typescript
      { name: 'Contrato enviado', defaultSector: 'cliente' },
```
```typescript
      { name: 'Site enviado novamente ao cliente', defaultSector: 'diretoria_criacao' },
```
to:
```typescript
      { name: 'Site enviado novamente ao cliente', defaultSector: 'cliente' },
```

In the `'Captação de Vídeo Local'` seed, change:
```typescript
      { name: 'Vídeo enviado', defaultSector: 'criacao' },
```
to:
```typescript
      { name: 'Vídeo enviado', defaultSector: 'cliente' },
```

In the `'Captação de Vídeo Externa'` seed, change these five lines:
```typescript
      { name: 'Orientações enviadas', defaultSector: 'criacao' },
      { name: 'Cliente realizando captação', defaultSector: 'criacao' },
      { name: 'Aguardando arquivos', defaultSector: 'criacao' },
```
to:
```typescript
      { name: 'Orientações enviadas', defaultSector: 'cliente' },
      { name: 'Cliente realizando captação', defaultSector: 'cliente' },
      { name: 'Aguardando arquivos', defaultSector: 'cliente' },
```
and:
```typescript
      { name: 'Material enviado', defaultSector: 'diretoria_criacao' },
      { name: 'Aprovação', defaultSector: 'diretoria_criacao' },
```
to:
```typescript
      { name: 'Material enviado', defaultSector: 'cliente' },
      { name: 'Aprovação', defaultSector: 'cliente' },
```

Also update the file's top comment (currently explaining the
convention-based workaround) to:

```typescript
/**
 * Etapas extraídas do PDF "Fluxos Operacionais BR7" (seções 3, 5, 6, 7, 8).
 * Cada lista segue o "caminho feliz" do fluxo: os ramos de aprovação/
 * alteração do PDF (ex: "9A aprovado" / "9B alteração solicitada") viram
 * loops manuais no Gantt depois, não etapas duplicadas no template.
 * Etapas que o PDF descreve como "está com: Cliente" usam
 * defaultSector: 'cliente'.
 */
```

- [ ] **Step 3: Update the unit test to cover the corrected sector**

In `backend/src/service-types/seed-service-templates.service.spec.ts`,
add this assertion inside the `'creates every flow...'` test, right
after the existing `socialMediaStageCalls[10]` assertion:

```typescript
    expect(socialMediaStageCalls[7][1]).toEqual({
      name: 'Material enviado ao cliente',
      defaultSector: 'cliente',
      defaultDurationDays: 1,
      order: 7,
    });
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/service-types/seed-service-templates.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (2 tests)

- [ ] **Step 5: Run the seed e2e test to confirm it still passes**

Run: `npx vitest run test/seed-service-templates.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS — it only asserts the first/last Social Media stage
(`Briefing interno` / `Cronograma concluído`), both untouched by this
change.

- [ ] **Step 6: Commit**

```bash
git add backend/src/common/sector.ts backend/src/service-types/seed-service-templates.service.ts backend/src/service-types/seed-service-templates.service.spec.ts
git commit -m "feat(backend): add cliente sector and correct seed data"
```

---

## Task 2: Phase module (backend)

**Files:**
- Create: `backend/src/phases/schemas/phase.schema.ts`
- Create: `backend/src/phases/dto/create-phase.dto.ts`
- Create: `backend/src/phases/dto/update-phase.dto.ts`
- Create: `backend/src/phases/dto/reorder-phases.dto.ts`
- Create: `backend/src/phases/phases.service.ts`
- Create: `backend/src/phases/phases.controller.ts`
- Create: `backend/src/phases/phases.module.ts`
- Test: `backend/src/phases/phases.service.spec.ts`
- Test: `backend/test/phases.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `ServiceTypesService.assertActive(id)` (existing).
- Produces: `PhasesService` with `create(serviceTypeId, dto)`,
  `findAllForServiceType(serviceTypeId): Promise<PhaseDocument[]>`
  (sorted by `order` — consumed by Task 6's frontend), `update(id, dto)`,
  `remove(id)` (unlinks `StageTemplate.phaseId` on every stage that
  referenced it), `reorder(serviceTypeId, orderedIds)`. `PhasesModule`
  exports `PhasesService` and registers the `Phase` schema (consumed
  directly, not via the module, by Task 3's `StageTemplatesModule`).

- [ ] **Step 1: Write the schema**

```typescript
// backend/src/phases/schemas/phase.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PhaseDocument = HydratedDocument<Phase>;

@Schema({ timestamps: true })
export class Phase {
  @Prop({ type: Types.ObjectId, ref: 'ServiceType', required: true })
  serviceTypeId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true, min: 0 })
  order: number;

  @Prop({ required: true, min: 1 })
  startDay: number;

  @Prop({ required: true, min: 1 })
  endDay: number;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const PhaseSchema = SchemaFactory.createForClass(Phase);
PhaseSchema.index({ serviceTypeId: 1, order: 1 }, { unique: true });
```

- [ ] **Step 2: Write the DTOs**

```typescript
// backend/src/phases/dto/create-phase.dto.ts
import { IsInt, IsString, Min } from 'class-validator';

export class CreatePhaseDto {
  @IsString()
  name: string;

  @IsString()
  color: string;

  @IsInt()
  @Min(1)
  startDay: number;

  @IsInt()
  @Min(1)
  endDay: number;
}
```

```typescript
// backend/src/phases/dto/update-phase.dto.ts
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  startDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  endDay?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
```

```typescript
// backend/src/phases/dto/reorder-phases.dto.ts
import { IsArray, IsString } from 'class-validator';

export class ReorderPhasesDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
```

- [ ] **Step 3: Write the failing unit test for the service**

```typescript
// backend/src/phases/phases.service.spec.ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PhasesService } from './phases.service.js';
import { Phase } from './schemas/phase.schema.js';
import { StageTemplate } from '../stage-templates/schemas/stage-template.schema.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

describe('PhasesService', () => {
  let service: PhasesService;
  const phaseModelMock = {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateOne: vi.fn(),
  };
  const stageTemplateModelMock = { updateMany: vi.fn() };
  const serviceTypesServiceMock = { assertActive: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PhasesService,
        { provide: getModelToken(Phase.name), useValue: phaseModelMock },
        { provide: getModelToken(StageTemplate.name), useValue: stageTemplateModelMock },
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(PhasesService);
  });

  it('creates a phase with the next order', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    phaseModelMock.countDocuments.mockResolvedValue(1);
    phaseModelMock.create.mockResolvedValue({ _id: 'phase-1', order: 1 });

    await service.create('st1', { name: 'Fase II', color: '#2563EB', startDay: 1, endDay: 4 });

    expect(phaseModelMock.create).toHaveBeenCalledWith({
      serviceTypeId: 'st1',
      name: 'Fase II',
      color: '#2563EB',
      startDay: 1,
      endDay: 4,
      order: 1,
    });
  });

  it('rejects creation when endDay is before startDay', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });

    await expect(
      service.create('st1', { name: 'Fase II', color: '#2563EB', startDay: 5, endDay: 2 }),
    ).rejects.toThrow(BadRequestException);
    expect(phaseModelMock.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating a missing phase', async () => {
    phaseModelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects an update where the new endDay is before the new startDay', async () => {
    await expect(service.update('phase-1', { startDay: 10, endDay: 2 })).rejects.toThrow(
      BadRequestException,
    );
    expect(phaseModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('unlinks stage templates from the phase when it is removed', async () => {
    phaseModelMock.findByIdAndDelete.mockResolvedValue({ _id: 'phase-1' });
    stageTemplateModelMock.updateMany.mockResolvedValue({});

    await service.remove('phase-1');

    expect(stageTemplateModelMock.updateMany).toHaveBeenCalledWith(
      { phaseId: 'phase-1' },
      { $unset: { phaseId: '' } },
    );
  });

  it('throws NotFoundException when removing a missing phase', async () => {
    phaseModelMock.findByIdAndDelete.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    expect(stageTemplateModelMock.updateMany).not.toHaveBeenCalled();
  });

  it('rejects reorder when the id set does not match the service type phases', async () => {
    phaseModelMock.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]),
    });

    await expect(service.reorder('st1', ['a', 'c'])).rejects.toThrow(BadRequestException);
  });

  it('reorders phases in two phases to avoid the unique index conflict', async () => {
    phaseModelMock.find
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]) })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([{ _id: 'b', order: 0 }, { _id: 'a', order: 1 }]),
      });
    phaseModelMock.updateOne.mockResolvedValue({});

    await service.reorder('st1', ['b', 'a']);

    expect(phaseModelMock.updateOne).toHaveBeenCalledTimes(4);
    expect(phaseModelMock.updateOne).toHaveBeenNthCalledWith(3, { _id: 'b' }, { order: 0 });
    expect(phaseModelMock.updateOne).toHaveBeenNthCalledWith(4, { _id: 'a' }, { order: 1 });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/phases/phases.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — `Cannot find module './phases.service.js'`

- [ ] **Step 5: Write the service**

```typescript
// backend/src/phases/phases.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from './schemas/phase.schema.js';
import { StageTemplate } from '../stage-templates/schemas/stage-template.schema.js';
import { CreatePhaseDto } from './dto/create-phase.dto.js';
import { UpdatePhaseDto } from './dto/update-phase.dto.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

@Injectable()
export class PhasesService {
  constructor(
    @InjectModel(Phase.name) private readonly phaseModel: Model<Phase>,
    @InjectModel(StageTemplate.name) private readonly stageTemplateModel: Model<StageTemplate>,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  async create(serviceTypeId: string, dto: CreatePhaseDto): Promise<PhaseDocument> {
    await this.serviceTypesService.assertActive(serviceTypeId);
    if (dto.endDay < dto.startDay) {
      throw new BadRequestException('endDay must be greater than or equal to startDay');
    }
    const order = await this.phaseModel.countDocuments({ serviceTypeId });
    return this.phaseModel.create({
      serviceTypeId,
      name: dto.name,
      color: dto.color,
      startDay: dto.startDay,
      endDay: dto.endDay,
      order,
    }) as Promise<PhaseDocument>;
  }

  findAllForServiceType(serviceTypeId: string): Promise<PhaseDocument[]> {
    return this.phaseModel.find({ serviceTypeId }).sort({ order: 1 }) as Promise<PhaseDocument[]>;
  }

  async update(id: string, dto: UpdatePhaseDto): Promise<PhaseDocument> {
    if (dto.startDay !== undefined && dto.endDay !== undefined && dto.endDay < dto.startDay) {
      throw new BadRequestException('endDay must be greater than or equal to startDay');
    }
    const updated = (await this.phaseModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as PhaseDocument | null;
    if (!updated) {
      throw new NotFoundException(`Phase ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.phaseModel.findByIdAndDelete(id);
    if (!removed) {
      throw new NotFoundException(`Phase ${id} not found`);
    }
    await this.stageTemplateModel.updateMany({ phaseId: id }, { $unset: { phaseId: '' } });
  }

  async reorder(serviceTypeId: string, orderedIds: string[]): Promise<PhaseDocument[]> {
    const existing = await this.phaseModel.find({ serviceTypeId }).lean();
    const existingIds = existing.map((p) => p._id.toString());
    const sameSet =
      existingIds.length === orderedIds.length &&
      existingIds.every((id) => orderedIds.includes(id));
    if (!sameSet) {
      throw new BadRequestException(
        'orderedIds must match exactly the phases of this service type',
      );
    }

    const offset = orderedIds.length;
    await Promise.all(
      orderedIds.map((id, index) => this.phaseModel.updateOne({ _id: id }, { order: offset + index })),
    );
    await Promise.all(
      orderedIds.map((id, index) => this.phaseModel.updateOne({ _id: id }, { order: index })),
    );

    return this.findAllForServiceType(serviceTypeId);
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/phases/phases.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (8 tests)

- [ ] **Step 7: Write the controller**

```typescript
// backend/src/phases/phases.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { PhasesService } from './phases.service.js';
import { CreatePhaseDto } from './dto/create-phase.dto.js';
import { UpdatePhaseDto } from './dto/update-phase.dto.js';
import { ReorderPhasesDto } from './dto/reorder-phases.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller()
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get('service-types/:serviceTypeId/phases')
  findAllForServiceType(@Param('serviceTypeId') serviceTypeId: string) {
    return this.phasesService.findAllForServiceType(serviceTypeId);
  }

  @Roles('admin')
  @Post('service-types/:serviceTypeId/phases')
  create(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: CreatePhaseDto) {
    return this.phasesService.create(serviceTypeId, dto);
  }

  @Roles('admin')
  @Patch('phases/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePhaseDto) {
    return this.phasesService.update(id, dto);
  }

  @Roles('admin')
  @Delete('phases/:id')
  remove(@Param('id') id: string) {
    return this.phasesService.remove(id);
  }

  @Roles('admin')
  @Put('service-types/:serviceTypeId/phases/reorder')
  reorder(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: ReorderPhasesDto) {
    return this.phasesService.reorder(serviceTypeId, dto.orderedIds);
  }
}
```

- [ ] **Step 8: Write the module**

```typescript
// backend/src/phases/phases.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhasesService } from './phases.service.js';
import { PhasesController } from './phases.controller.js';
import { Phase, PhaseSchema } from './schemas/phase.schema.js';
import { StageTemplate, StageTemplateSchema } from '../stage-templates/schemas/stage-template.schema.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Phase.name, schema: PhaseSchema },
      { name: StageTemplate.name, schema: StageTemplateSchema },
    ]),
    ServiceTypesModule,
  ],
  providers: [PhasesService],
  controllers: [PhasesController],
  exports: [PhasesService],
})
export class PhasesModule {}
```

Note: this module registers the `StageTemplate` schema directly (for the
unlink-on-delete `updateMany`) instead of importing `StageTemplatesModule`
— that would create a circular module dependency once Task 3 makes
`StageTemplatesModule` register the `Phase` schema for its own
cross-check. Both modules depend only on the schema, never on each
other's NestJS module.

- [ ] **Step 9: Wire it into `AppModule`**

In `backend/src/app.module.ts`, add
`import { PhasesModule } from './phases/phases.module.js';` and add
`PhasesModule` to the `imports` array, right after `StageTemplatesModule`.

- [ ] **Step 10: Write the failing e2e test**

```typescript
// backend/test/phases.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Phases (e2e)', () => {
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

    // Unique per beforeEach run: ServiceType.name is globally unique and
    // SeedServiceTemplatesService also seeds 5 fixed names on every boot.
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Ecommerce ${Date.now()}-${Math.random()}` });
    serviceTypeId = serviceType.body._id;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('creates phases in order, reorders them, and rejects an incomplete reorder', async () => {
    const phase1 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fase I', color: '#2563EB', startDay: 1, endDay: 2 })
      .expect(201);
    expect(phase1.body.order).toBe(0);

    const phase2 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fase II', color: '#3B82F6', startDay: 1, endDay: 4 })
      .expect(201);
    expect(phase2.body.order).toBe(1);

    const reordered = await request(app.getHttpServer())
      .put(`/service-types/${serviceTypeId}/phases/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedIds: [phase2.body._id, phase1.body._id] })
      .expect(200);
    expect(reordered.body[0]._id).toBe(phase2.body._id);
    expect(reordered.body[0].order).toBe(0);

    await request(app.getHttpServer())
      .put(`/service-types/${serviceTypeId}/phases/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedIds: [phase1.body._id] })
      .expect(400);
  });

  it('rejects a phase with endDay before startDay', async () => {
    await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fase I', color: '#2563EB', startDay: 10, endDay: 2 })
      .expect(400);
  });

  it('archives a phase via PATCH active:false', async () => {
    const phase = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fase I', color: '#2563EB', startDay: 1, endDay: 2 });

    const archived = await request(app.getHttpServer())
      .patch(`/phases/${phase.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false })
      .expect(200);
    expect(archived.body.active).toBe(false);
  });

  it('unlinks a stage template from a deleted phase without deleting the stage', async () => {
    const phase = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fase I', color: '#2563EB', startDay: 1, endDay: 2 });

    const stage = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Briefing',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
        phaseId: phase.body._id,
      })
      .expect(201);
    expect(stage.body.phaseId).toBe(phase.body._id);

    await request(app.getHttpServer())
      .delete(`/phases/${phase.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stages = await request(app.getHttpServer())
      .get(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const found = stages.body.find((s: { _id: string }) => s._id === stage.body._id);
    expect(found.phaseId).toBeUndefined();
  });
});
```

- [ ] **Step 11: Run the e2e test and confirm it passes**

Run: `npx vitest run test/phases.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: FAIL first (the `phaseId` field doesn't exist on
`StageTemplate` yet — Task 3 adds it). This is expected; continue to
Task 3 before re-running this file.

- [ ] **Step 12: Commit**

```bash
git add backend/src/phases backend/src/app.module.ts backend/test/phases.e2e-spec.ts
git commit -m "feat(backend): add Phase module with archive and unlink-on-delete"
```

---

## Task 3: `phaseId` + `active` on StageTemplate (backend)

**Files:**
- Modify: `backend/src/stage-templates/schemas/stage-template.schema.ts`
- Modify: `backend/src/stage-templates/dto/create-stage-template.dto.ts`
- Modify: `backend/src/stage-templates/dto/update-stage-template.dto.ts`
- Modify: `backend/src/stage-templates/stage-templates.service.ts`
- Modify: `backend/src/stage-templates/stage-templates.module.ts`
- Modify: `backend/src/stage-templates/stage-templates.service.spec.ts`

**Interfaces:**
- Consumes: the `Phase` Mongoose schema (registered directly via
  `MongooseModule.forFeature`, not via `PhasesModule`, to avoid a
  circular module dependency with Task 2's `PhasesModule`).
- Produces: `StageTemplateDocument.phaseId?: Types.ObjectId`,
  `.active: boolean`; `CreateStageTemplateDto.phaseId?: string`;
  `UpdateStageTemplateDto.phaseId?: string | null` (`null` explicitly
  clears the phase assignment, `undefined`/omitted leaves it
  untouched), `.active?: boolean` — consumed by Task 4's
  `ProjectsService.create()` (filters `stage.active`) and Task 7's
  frontend.

- [ ] **Step 1: Update the schema**

```typescript
// backend/src/stage-templates/schemas/stage-template.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

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

  @Prop({ type: Types.ObjectId, ref: 'Phase' })
  phaseId?: Types.ObjectId;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const StageTemplateSchema = SchemaFactory.createForClass(StageTemplate);
StageTemplateSchema.index({ serviceTypeId: 1, order: 1 }, { unique: true });
```

- [ ] **Step 2: Update the DTOs**

```typescript
// backend/src/stage-templates/dto/create-stage-template.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

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

  @IsOptional()
  @IsString()
  phaseId?: string;
}
```

```typescript
// backend/src/stage-templates/dto/update-stage-template.dto.ts
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SECTORS } from '../../common/sector.js';
import type { Sector } from '../../common/sector.js';

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

  @IsOptional()
  @IsString()
  phaseId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
```

- [ ] **Step 3: Write the failing unit tests for phase validation**

Append to `backend/src/stage-templates/stage-templates.service.spec.ts`
(inside the existing `describe`, after the last `it`). First add a
`phaseModelMock` and pass it into the testing module:

```typescript
  const phaseModelMock = { findById: vi.fn() };
```

(add this line next to the existing `const serviceTypesServiceMock = ...`)
and add `{ provide: getModelToken('Phase'), useValue: phaseModelMock },`
to the `providers` array in `beforeEach` (import `getModelToken` is
already imported at the top of the file).

Then add these tests:

```typescript
  it('rejects creating a stage with a phaseId from another service type', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    phaseModelMock.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'phase-1', serviceTypeId: 'st2' }),
    });

    await expect(
      service.create('st1', {
        name: 'Briefing',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
        phaseId: 'phase-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(modelMock.create).not.toHaveBeenCalled();
  });

  it('creates a stage with a phaseId that belongs to the same service type', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    phaseModelMock.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'phase-1', serviceTypeId: 'st1' }),
    });
    modelMock.countDocuments.mockResolvedValue(0);
    modelMock.create.mockResolvedValue({ _id: 'stage-1' });

    await service.create('st1', {
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      phaseId: 'phase-1',
    });

    expect(modelMock.create).toHaveBeenCalledWith({
      serviceTypeId: 'st1',
      order: 0,
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      phaseId: 'phase-1',
    });
  });

  it('rejects updating a stage with a phaseId from another service type', async () => {
    modelMock.findById.mockResolvedValue({ _id: 'stage-1', serviceTypeId: 'st1' });
    phaseModelMock.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'phase-1', serviceTypeId: 'st2' }),
    });

    await expect(service.update('stage-1', { phaseId: 'phase-1' })).rejects.toThrow(
      BadRequestException,
    );
    expect(modelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('allows clearing a stage phaseId by sending null', async () => {
    modelMock.findByIdAndUpdate.mockResolvedValue({ _id: 'stage-1', phaseId: undefined });

    await service.update('stage-1', { phaseId: null });

    expect(modelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      'stage-1',
      { phaseId: null },
      { returnDocument: 'after' },
    );
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run src/stage-templates/stage-templates.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — `create`/`update` don't validate `phaseId` yet, and
the constructor doesn't accept a `Phase` model token yet (compile/DI
error).

- [ ] **Step 5: Implement the validation in the service**

```typescript
// backend/src/stage-templates/stage-templates.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StageTemplate, StageTemplateDocument } from './schemas/stage-template.schema.js';
import { Phase } from '../phases/schemas/phase.schema.js';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto.js';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

@Injectable()
export class StageTemplatesService {
  constructor(
    @InjectModel(StageTemplate.name) private readonly stageTemplateModel: Model<StageTemplate>,
    @InjectModel(Phase.name) private readonly phaseModel: Model<Phase>,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  private async assertPhaseBelongsToServiceType(
    phaseId: string,
    serviceTypeId: string,
  ): Promise<void> {
    const phase = await this.phaseModel.findById(phaseId).lean();
    if (!phase || phase.serviceTypeId.toString() !== serviceTypeId) {
      throw new BadRequestException(
        `Phase ${phaseId} does not belong to service type ${serviceTypeId}`,
      );
    }
  }

  async create(serviceTypeId: string, dto: CreateStageTemplateDto): Promise<StageTemplateDocument> {
    await this.serviceTypesService.assertActive(serviceTypeId);
    if (dto.phaseId) {
      await this.assertPhaseBelongsToServiceType(dto.phaseId, serviceTypeId);
    }
    const order = dto.order ?? (await this.stageTemplateModel.countDocuments({ serviceTypeId }));
    return this.stageTemplateModel.create({
      serviceTypeId,
      order,
      name: dto.name,
      defaultSector: dto.defaultSector,
      defaultDurationDays: dto.defaultDurationDays,
      phaseId: dto.phaseId,
    }) as Promise<StageTemplateDocument>;
  }

  findAllForServiceType(serviceTypeId: string): Promise<StageTemplateDocument[]> {
    return this.stageTemplateModel
      .find({ serviceTypeId })
      .sort({ order: 1 }) as Promise<StageTemplateDocument[]>;
  }

  async update(id: string, dto: UpdateStageTemplateDto): Promise<StageTemplateDocument> {
    if (dto.phaseId) {
      const stage = (await this.stageTemplateModel.findById(id)) as StageTemplateDocument | null;
      if (!stage) {
        throw new NotFoundException(`StageTemplate ${id} not found`);
      }
      await this.assertPhaseBelongsToServiceType(dto.phaseId, stage.serviceTypeId.toString());
    }

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

    const offset = orderedIds.length;
    await Promise.all(
      orderedIds.map((id, index) =>
        this.stageTemplateModel.updateOne({ _id: id }, { order: offset + index }),
      ),
    );
    await Promise.all(
      orderedIds.map((id, index) =>
        this.stageTemplateModel.updateOne({ _id: id }, { order: index }),
      ),
    );

    return this.findAllForServiceType(serviceTypeId);
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/stage-templates/stage-templates.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (8 tests)

- [ ] **Step 7: Update the module to register the `Phase` schema directly**

```typescript
// backend/src/stage-templates/stage-templates.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StageTemplatesService } from './stage-templates.service.js';
import { StageTemplatesController } from './stage-templates.controller.js';
import { StageTemplate, StageTemplateSchema } from './schemas/stage-template.schema.js';
import { Phase, PhaseSchema } from '../phases/schemas/phase.schema.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StageTemplate.name, schema: StageTemplateSchema },
      { name: Phase.name, schema: PhaseSchema },
    ]),
    ServiceTypesModule,
  ],
  providers: [StageTemplatesService],
  controllers: [StageTemplatesController],
  exports: [StageTemplatesService],
})
export class StageTemplatesModule {}
```

This mirrors Task 2's `PhasesModule`, which registers `StageTemplate`'s
schema directly — neither module imports the other's NestJS module, so
there's no circular dependency.

- [ ] **Step 8: Run the full backend unit suite**

Run: `npm run test --prefix backend`
Expected: PASS — no regressions in `ProjectsService`/other specs (Task 4
updates those fixtures next).

- [ ] **Step 9: Run the Phase e2e test from Task 2, now that `phaseId` exists**

Run: `npx vitest run test/phases.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS (4 tests)

- [ ] **Step 10: Run the full e2e suite**

Run: `npm run test:e2e --prefix backend`
Expected: PASS — `project-template-generation.e2e-spec.ts` and others
are unaffected since `active` defaults to `true` and `phaseId` is
optional.

- [ ] **Step 11: Commit**

```bash
git add backend/src/stage-templates
git commit -m "feat(backend): add phaseId and active to StageTemplate"
```

---

## Task 4: Skip archived stages during project generation (backend)

**Files:**
- Modify: `backend/src/projects/projects.service.ts`
- Modify: `backend/src/projects/projects.service.spec.ts`
- Modify: `backend/test/project-template-generation.e2e-spec.ts`

**Interfaces:**
- Consumes: `StageTemplateDocument.active` (Task 3).
- Produces: no new exported interface — `ProjectsService.create()`'s
  stage-generation filter now excludes archived stages in addition to
  client-disabled ones.

- [ ] **Step 1: Update the existing fixtures in the unit test**

In `backend/src/projects/projects.service.spec.ts`, every stage object
returned by `stageTemplatesServiceMock.findAllForServiceType` needs
`active: true` added (they'd otherwise be filtered out by the new
check). Update all three occurrences:

```typescript
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2, active: true },
      { _id: { toString: () => 's2' }, name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1, active: true },
```
(in the first test) and the single-stage array in the second and third
tests likewise gets `, active: true` appended to its one object.

- [ ] **Step 2: Write the failing test for archived-stage exclusion**

Add this test at the end of the `describe` block, before the closing
`});`:

```typescript
  it('excludes archived stages from generation even when not disabled by the client', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2, active: true },
      { _id: { toString: () => 's2' }, name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1, active: false },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue([]);

    await service.create(
      { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
      'user-1',
    );

    expect(tasksServiceMock.generateFromTemplate).toHaveBeenCalledWith('p1', '2026-01-01', [
      { id: 's1', name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
    ]);
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/projects/projects.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: FAIL — the archived stage `s2` is still included since
nothing filters on `active` yet.

- [ ] **Step 4: Add the `active` filter**

In `backend/src/projects/projects.service.ts`, change:

```typescript
      const activeStages = stageTemplates
        .filter((stage) => !disabledIds.includes(stage._id.toString()))
        .map((stage) => ({
```

to:

```typescript
      const activeStages = stageTemplates
        .filter((stage) => stage.active)
        .filter((stage) => !disabledIds.includes(stage._id.toString()))
        .map((stage) => ({
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/projects/projects.service.spec.ts --config vitest.config.ts` (from `backend/`)
Expected: PASS (5 tests)

- [ ] **Step 6: Write the failing e2e test for archived-stage exclusion**

Append this test to `backend/test/project-template-generation.e2e-spec.ts`,
inside the existing `describe`, after the last `it`:

```typescript
  it('excludes an archived stage from a newly created project', async () => {
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Social Media ${Date.now()}-${Math.random()}` });
    const serviceTypeId = serviceType.body._id;

    await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Briefing', defaultSector: 'diretoria_criacao', defaultDurationDays: 2 });
    const stage2 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1 });

    await request(app.getHttpServer())
      .patch(`/stage-templates/${stage2.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false })
      .expect(200);

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Arquivamento' });

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Campanha Arquivada',
        clientId: client.body._id,
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
  });
```

- [ ] **Step 7: Run the e2e test and confirm it passes**

Run: `npx vitest run test/project-template-generation.e2e-spec.ts --config vitest.config.e2e.ts` (from `backend/`)
Expected: PASS (3 tests)

- [ ] **Step 8: Run the full backend suite one more time**

Run: `npm run build --prefix backend && npm run test --prefix backend && npm run test:e2e --prefix backend`
Expected: PASS, all green.

- [ ] **Step 9: Commit**

```bash
git add backend/src/projects backend/test/project-template-generation.e2e-spec.ts
git commit -m "feat(backend): exclude archived stage templates from project generation"
```

---

## Task 5: Frontend types + `api/phases.ts` + `api/stageTemplates.ts` update

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/api/phases.ts`
- Modify: `frontend/src/api/stageTemplates.ts`

**Interfaces:**
- Produces: `SECTORS`/`SECTOR_LABELS` include `cliente`; new `Phase`
  type; `StageTemplate` gains `phaseId?: string | null` and `active:
  boolean`; `listPhases`, `createPhase`, `updatePhase`, `deletePhase`,
  `reorderPhases`; `createStageTemplate`/`updateStageTemplate` accept
  the new fields — consumed by Tasks 6-7.

- [ ] **Step 1: Update `types.ts`**

In `frontend/src/types.ts`, change the `SECTORS` array to add
`'cliente'`:

```typescript
export const SECTORS = [
  'diretoria',
  'diretoria_executiva',
  'diretoria_criacao',
  'criacao',
  'desenvolvimento',
  'cliente',
] as const;
```

Add `cliente: 'Cliente',` to `SECTOR_LABELS` (after `desenvolvimento`).

Add this interface after `interface ServiceType`:

```typescript
export interface Phase {
  _id: string;
  serviceTypeId: string;
  name: string;
  color: string;
  order: number;
  startDay: number;
  endDay: number;
  active: boolean;
}
```

Update the `StageTemplate` interface to add two fields after
`defaultDurationDays: number;`:

```typescript
  phaseId?: string;
  active: boolean;
```

- [ ] **Step 2: Create `api/phases.ts`**

```typescript
// frontend/src/api/phases.ts
import { apiClient } from './client.js';
import type { Phase } from '../types.js';

export function listPhases(serviceTypeId: string) {
  return apiClient
    .get<Phase[]>(`/service-types/${serviceTypeId}/phases`)
    .then((res) => res.data);
}

export function createPhase(
  serviceTypeId: string,
  dto: { name: string; color: string; startDay: number; endDay: number },
) {
  return apiClient
    .post<Phase>(`/service-types/${serviceTypeId}/phases`, dto)
    .then((res) => res.data);
}

export function updatePhase(
  id: string,
  dto: { name?: string; color?: string; startDay?: number; endDay?: number; active?: boolean },
) {
  return apiClient.patch<Phase>(`/phases/${id}`, dto).then((res) => res.data);
}

export function deletePhase(id: string) {
  return apiClient.delete(`/phases/${id}`);
}

export function reorderPhases(serviceTypeId: string, orderedIds: string[]) {
  return apiClient
    .put<Phase[]>(`/service-types/${serviceTypeId}/phases/reorder`, { orderedIds })
    .then((res) => res.data);
}
```

- [ ] **Step 3: Update `api/stageTemplates.ts`**

Replace the `createStageTemplate` and `updateStageTemplate` functions:

```typescript
export function createStageTemplate(
  serviceTypeId: string,
  dto: { name: string; defaultSector: Sector; defaultDurationDays: number; phaseId?: string },
) {
  return apiClient
    .post<StageTemplate>(`/service-types/${serviceTypeId}/stage-templates`, dto)
    .then((res) => res.data);
}

export function updateStageTemplate(
  id: string,
  dto: {
    name?: string;
    defaultSector?: Sector;
    defaultDurationDays?: number;
    phaseId?: string | null;
    active?: boolean;
  },
) {
  return apiClient.patch<StageTemplate>(`/stage-templates/${id}`, dto).then((res) => res.data);
}
```

- [ ] **Step 4: Type-check the frontend**

Run: `npm run build --prefix frontend`
Expected: succeeds (nothing consumes the new fields yet, so no call
sites are broken — `StageTemplateModal`'s `onSave` dto is a subset of
the now-wider accepted shape).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/phases.ts frontend/src/api/stageTemplates.ts
git commit -m "feat(frontend): add cliente sector, Phase type and phases API client"
```

---

## Task 6: Fases section (frontend)

**Files:**
- Create: `frontend/src/components/PhaseModal.tsx`
- Modify: `frontend/src/pages/StageTemplatesPage.tsx`
- Modify: `frontend/src/pages/StageTemplatesPage.test.tsx`

**Interfaces:**
- Consumes: `listPhases`, `createPhase`, `updatePhase`, `deletePhase`,
  `reorderPhases` (Task 5).
- Produces: the "Fases" section on `/tipos-servico/:id/etapas` — phases
  are fetched and available in page state for Task 7's grouped Etapas
  section to consume (`phases: Phase[]` becomes local state on
  `StageTemplatesPage`).

- [ ] **Step 1: Write the failing test for the Fases section**

Add these tests to `frontend/src/pages/StageTemplatesPage.test.tsx`
(new imports at the top, then two new `it` blocks inside the existing
`describe`):

```typescript
import * as phasesApi from '../api/phases.js';
import type { Phase } from '../types.js';
```

```typescript
const phases: Phase[] = [
  { _id: 'ph1', serviceTypeId: 'st1', name: 'Fase I', color: '#2563EB', order: 0, startDay: 1, endDay: 2, active: true },
];
```

```typescript
  it('lists phases and creates a new one', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue([]);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);
    vi.spyOn(phasesApi, 'createPhase').mockResolvedValue({
      _id: 'ph2',
      serviceTypeId: 'st1',
      name: 'Fase II',
      color: '#3B82F6',
      order: 1,
      startDay: 1,
      endDay: 4,
      active: true,
    });

    renderPage();

    expect(await screen.findByText('Fase I')).toBeInTheDocument();
    expect(screen.getByText('dias 1–2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /nova fase/i }));
    await userEvent.type(screen.getByLabelText(/nome da fase/i), 'Fase II');
    await userEvent.type(screen.getByLabelText(/dia inicial/i), '1');
    await userEvent.type(screen.getByLabelText(/dia final/i), '4');
    await userEvent.click(screen.getByRole('button', { name: /^salvar fase$/i }));

    await waitFor(() =>
      expect(phasesApi.createPhase).toHaveBeenCalledWith('st1', {
        name: 'Fase II',
        color: expect.any(String),
        startDay: 1,
        endDay: 4,
      }),
    );
  });

  it('archives a phase', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue([]);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);
    vi.spyOn(phasesApi, 'updatePhase').mockResolvedValue({ ...phases[0], active: false });

    renderPage();
    await screen.findByText('Fase I');

    await userEvent.click(screen.getByRole('button', { name: /^desativar$/i }));

    await waitFor(() =>
      expect(phasesApi.updatePhase).toHaveBeenCalledWith('ph1', { active: false }),
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/StageTemplatesPage.test.tsx` (from `frontend/`)
Expected: FAIL — no "Nova fase" button or Fases section exist yet.

- [ ] **Step 3: Write `PhaseModal.tsx`**

```typescript
// frontend/src/components/PhaseModal.tsx
import { useState, type FormEvent } from 'react';
import type { Phase } from '../types.js';

interface Props {
  initial?: Phase;
  onClose: () => void;
  onSave: (dto: { name: string; color: string; startDay: number; endDay: number }) => void;
}

export function PhaseModal({ initial, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#2563EB');
  const [startDay, setStartDay] = useState(initial ? String(initial.startDay) : '');
  const [endDay, setEndDay] = useState(initial ? String(initial.endDay) : '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, color, startDay: Number(startDay), endDay: Number(endDay) });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{initial ? 'Editar fase' : 'Nova fase'}</h2>
        <div>
          <label htmlFor="phase-name" className="block text-sm text-gray-600">
            Nome da fase
          </label>
          <input
            id="phase-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="phase-color" className="block text-sm text-gray-600">
            Cor
          </label>
          <input
            id="phase-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 h-10 w-16 rounded border border-gray-300"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="phase-start-day" className="block text-sm text-gray-600">
              Dia inicial
            </label>
            <input
              id="phase-start-day"
              type="number"
              min={1}
              value={startDay}
              onChange={(e) => setStartDay(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="phase-end-day" className="block text-sm text-gray-600">
              Dia final
            </label>
            <input
              id="phase-end-day"
              type="number"
              min={1}
              value={endDay}
              onChange={(e) => setEndDay(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Salvar fase
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Add the Fases section to `StageTemplatesPage.tsx`**

Replace the full contents of `frontend/src/pages/StageTemplatesPage.tsx`:

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
import {
  listPhases,
  createPhase,
  updatePhase,
  deletePhase,
  reorderPhases,
} from '../api/phases.js';
import { StageTemplateModal } from '../components/StageTemplateModal.js';
import { PhaseModal } from '../components/PhaseModal.js';
import { SECTOR_LABELS, type Phase, type Sector, type StageTemplate } from '../types.js';

export function StageTemplatesPage() {
  const { serviceTypeId } = useParams<{ serviceTypeId: string }>();
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [modalStage, setModalStage] = useState<StageTemplate | 'new' | null>(null);
  const [modalPhase, setModalPhase] = useState<Phase | 'new' | null>(null);

  function refresh() {
    if (!serviceTypeId) return;
    listStageTemplates(serviceTypeId).then(setStages);
    listPhases(serviceTypeId).then(setPhases);
  }

  useEffect(refresh, [serviceTypeId]);

  async function handleSaveStage(dto: {
    name: string;
    defaultSector: Sector;
    defaultDurationDays: number;
    phaseId?: string | null;
  }) {
    if (!serviceTypeId) return;
    if (modalStage && modalStage !== 'new') {
      await updateStageTemplate(modalStage._id, dto);
    } else {
      await createStageTemplate(serviceTypeId, { ...dto, phaseId: dto.phaseId ?? undefined });
    }
    setModalStage(null);
    refresh();
  }

  async function handleDeleteStage(id: string) {
    await deleteStageTemplate(id);
    refresh();
  }

  async function handleToggleStageActive(stage: StageTemplate) {
    await updateStageTemplate(stage._id, { active: !stage.active });
    refresh();
  }

  async function handleMoveStage(index: number, direction: -1 | 1) {
    if (!serviceTypeId) return;
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await reorderStageTemplates(serviceTypeId, reordered.map((s) => s._id));
    refresh();
  }

  async function handleSavePhase(dto: {
    name: string;
    color: string;
    startDay: number;
    endDay: number;
  }) {
    if (!serviceTypeId) return;
    if (modalPhase && modalPhase !== 'new') {
      await updatePhase(modalPhase._id, dto);
    } else {
      await createPhase(serviceTypeId, dto);
    }
    setModalPhase(null);
    refresh();
  }

  async function handleDeletePhase(id: string) {
    await deletePhase(id);
    refresh();
  }

  async function handleTogglePhaseActive(phase: Phase) {
    await updatePhase(phase._id, { active: !phase.active });
    refresh();
  }

  async function handleMovePhase(index: number, direction: -1 | 1) {
    if (!serviceTypeId) return;
    const target = index + direction;
    if (target < 0 || target >= phases.length) return;
    const reordered = [...phases];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await reorderPhases(serviceTypeId, reordered.map((p) => p._id));
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Fases</h1>
        <button
          onClick={() => setModalPhase('new')}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Nova fase
        </button>
      </div>

      <ul className="mb-10 space-y-3">
        {phases.map((phase, index) => (
          <li
            key={phase._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded"
                style={{ backgroundColor: phase.color }}
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-gray-800">
                  {phase.name}
                  {!phase.active && <span className="ml-2 text-xs text-gray-400">(arquivada)</span>}
                </p>
                <p className="text-sm text-gray-500">
                  dias {phase.startDay}–{phase.endDay}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Mover fase para cima"
                disabled={index === 0}
                onClick={() => handleMovePhase(index, -1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                aria-label="Mover fase para baixo"
                disabled={index === phases.length - 1}
                onClick={() => handleMovePhase(index, 1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => setModalPhase(phase)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Editar
              </button>
              <button
                onClick={() => handleTogglePhaseActive(phase)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {phase.active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => handleDeletePhase(phase._id)}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Etapas do template padrão</h2>
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
              <p className="font-medium text-gray-800">
                {stage.name}
                {!stage.active && <span className="ml-2 text-xs text-gray-400">(arquivada)</span>}
              </p>
              <p className="text-sm text-gray-500">
                {SECTOR_LABELS[stage.defaultSector]} · {stage.defaultDurationDays} dia(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Mover para cima"
                disabled={index === 0}
                onClick={() => handleMoveStage(index, -1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                aria-label="Mover para baixo"
                disabled={index === stages.length - 1}
                onClick={() => handleMoveStage(index, 1)}
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
                onClick={() => handleToggleStageActive(stage)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {stage.active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => handleDeleteStage(stage._id)}
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
          phases={phases}
          onClose={() => setModalStage(null)}
          onSave={handleSaveStage}
        />
      )}

      {modalPhase && (
        <PhaseModal
          initial={modalPhase === 'new' ? undefined : modalPhase}
          onClose={() => setModalPhase(null)}
          onSave={handleSavePhase}
        />
      )}
    </div>
  );
}
```

Note: this step passes a `phases` prop to `StageTemplateModal` that
doesn't exist yet — Task 7 adds it. The Fases-section tests (Step 1)
pass already at this point; the existing Etapas tests keep passing
because `StageTemplateModal`'s current props are a subset of what
Task 7 will accept (adding a prop doesn't break the modal's current
call signature since Task 7 makes it optional... actually the modal
component itself doesn't read `phases` yet, so passing it as an extra
prop is inert until Task 7 — TypeScript will flag it as an excess
prop only if `StageTemplateModal`'s `Props` type is a `strict` object
type with no index signature, which it is. To keep this task's frontend
type-check green, Task 7's `StageTemplateModal` prop addition must land
before running `npm run build`; run the test suite (Step 5 below) which
uses `vitest` (no type-check) to confirm behavior first, then treat the
`tsc` build as expected-red until Task 7 lands its half.

- [ ] **Step 5: Run the frontend test suite**

Run: `npx vitest run src/pages/StageTemplatesPage.test.tsx` (from `frontend/`)
Expected: PASS (4 tests: the 2 existing Etapas tests + the 2 new Fases
tests from Step 1). Vitest doesn't type-check, so the not-yet-existing
`phases` prop on `StageTemplateModal` doesn't fail this run.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/PhaseModal.tsx frontend/src/pages/StageTemplatesPage.tsx frontend/src/pages/StageTemplatesPage.test.tsx
git commit -m "feat(frontend): add Fases section to the template editor"
```

---

## Task 7: Group Etapas by Fase + phase select in the stage modal (frontend)

**Files:**
- Modify: `frontend/src/components/StageTemplateModal.tsx`
- Modify: `frontend/src/pages/StageTemplatesPage.tsx`
- Modify: `frontend/src/pages/StageTemplatesPage.test.tsx`

**Interfaces:**
- Consumes: `phases: Phase[]` (Task 6's page state).
- Produces: `StageTemplateModal` now takes a `phases: Phase[]` prop and
  its `onSave` dto includes `phaseId: string | null` (`null` = "Sem
  fase"); the Etapas list on `StageTemplatesPage` is grouped by phase
  (phase order, then a trailing "Sem fase" group), each stage's
  ↑/↓ move recomputed within its own group so the reorder call sent to
  the backend keeps the full service type's flat `order` consistent
  with the on-screen grouped position (phase order first, then
  in-group position).

- [ ] **Step 1: Write the failing test for the phase select and grouping**

Add these tests to `frontend/src/pages/StageTemplatesPage.test.tsx`
(after the ones added in Task 6, still inside the same `describe`; the
`phases` fixture from Task 6 is reused):

```typescript
  it('shows a Fase select in the stage modal and sends the chosen phaseId', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);
    vi.spyOn(stageTemplatesApi, 'createStageTemplate').mockResolvedValue({
      _id: 's3',
      serviceTypeId: 'st1',
      order: 2,
      name: 'LinkedIn',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      active: true,
    });

    renderPage();
    await screen.findByText('Briefing');

    await userEvent.click(screen.getByRole('button', { name: /nova etapa/i }));
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'LinkedIn');
    await userEvent.selectOptions(screen.getByLabelText(/setor/i), 'criacao');
    await userEvent.type(screen.getByLabelText(/duração/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/fase/i), 'ph1');
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(stageTemplatesApi.createStageTemplate).toHaveBeenCalledWith('st1', {
        name: 'LinkedIn',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
        phaseId: 'ph1',
      }),
    );
  });

  it('groups stages under their Fase heading, with ungrouped stages under Sem fase', async () => {
    const stagesWithPhase = [
      { ...stages[0], phaseId: 'ph1' },
      { ...stages[1], phaseId: undefined },
    ];
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stagesWithPhase);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);

    renderPage();

    await screen.findByText('Briefing');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Fase I', 'Sem fase']);
  });
```

Note: `stages` in the existing fixture (defined earlier in the file)
don't have `phaseId`/`active` set — add `active: true` to both objects
in the `stages` array at the top of the file (required now that
`StageTemplate.active` is non-optional in `types.ts`):

```typescript
const stages: StageTemplate[] = [
  {
    _id: 's1',
    serviceTypeId: 'st1',
    order: 0,
    name: 'Briefing',
    defaultSector: 'diretoria_criacao',
    defaultDurationDays: 2,
    active: true,
  },
  {
    _id: 's2',
    serviceTypeId: 'st1',
    order: 1,
    name: 'Facebook',
    defaultSector: 'criacao',
    defaultDurationDays: 1,
    active: true,
  },
];
```

Also update the `createStageTemplate`/`reorderStageTemplates` mock
resolved values used by the two pre-existing tests in this file to
include `active: true` in their returned objects (needed for
TypeScript, since `StageTemplate.active` is now required) — add
`active: true,` to the object passed to `mockResolvedValue` in the
`'creates a new one'` test and to both objects inside the array passed
to `mockResolvedValue` in the `'moves a stage down'` test.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/StageTemplatesPage.test.tsx` (from `frontend/`)
Expected: FAIL — no "Fase" label in the modal yet, and stages aren't
grouped under headings yet.

- [ ] **Step 3: Add the Fase select to `StageTemplateModal.tsx`**

Replace the full contents of `frontend/src/components/StageTemplateModal.tsx`:

```typescript
// frontend/src/components/StageTemplateModal.tsx
import { useState, type FormEvent } from 'react';
import { SECTORS, SECTOR_LABELS, type Phase, type Sector, type StageTemplate } from '../types.js';

interface Props {
  initial?: StageTemplate;
  phases: Phase[];
  onClose: () => void;
  onSave: (dto: {
    name: string;
    defaultSector: Sector;
    defaultDurationDays: number;
    phaseId: string | null;
  }) => void;
}

export function StageTemplateModal({ initial, phases, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [defaultSector, setDefaultSector] = useState<Sector>(initial?.defaultSector ?? SECTORS[0]);
  const [defaultDurationDays, setDefaultDurationDays] = useState(
    initial ? String(initial.defaultDurationDays) : '',
  );
  const [phaseId, setPhaseId] = useState(initial?.phaseId ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      name,
      defaultSector,
      defaultDurationDays: Number(defaultDurationDays),
      phaseId: phaseId || null,
    });
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
        <div>
          <label htmlFor="stage-phase" className="block text-sm text-gray-600">
            Fase
          </label>
          <select
            id="stage-phase"
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Sem fase</option>
            {phases.map((phase) => (
              <option key={phase._id} value={phase._id}>
                {phase.name}
              </option>
            ))}
          </select>
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

Note: `onSave`'s dto always includes `phaseId: string | null` now
(never omitted), so `StageTemplatesPage.handleSaveStage` (Task 6) — which
does `createStageTemplate(serviceTypeId, { ...dto, phaseId: dto.phaseId ?? undefined })`
— already handles both cases correctly (`null` → `undefined` for the
create call, which the API layer treats as "no phase"; for the update
call `updateStageTemplate(modalStage._id, dto)` passes `phaseId: null`
straight through, which is exactly what clears an existing assignment
per Task 3's backend contract).

- [ ] **Step 4: Group the Etapas list by Fase in `StageTemplatesPage.tsx`**

Replace the Etapas section of `frontend/src/pages/StageTemplatesPage.tsx`
— everything from `<div className="mb-6 flex items-center justify-between">`
that contains `Etapas do template padrão` down through the closing
`</ul>` right before `{modalStage && (` — with:

```typescript
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Etapas do template padrão</h2>
        <button
          onClick={() => setModalStage('new')}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Nova etapa
        </button>
      </div>

      {stageGroups.map((group) => (
        <div key={group.key} className="mb-8">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
            {group.phase && (
              <span
                className="h-3 w-3 rounded"
                style={{ backgroundColor: group.phase.color }}
                aria-hidden="true"
              />
            )}
            {group.label}
          </h3>
          <ul className="space-y-3">
            {group.stages.map((stage) => (
              <li
                key={stage._id}
                className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {stage.name}
                    {!stage.active && <span className="ml-2 text-xs text-gray-400">(arquivada)</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {SECTOR_LABELS[stage.defaultSector]} · {stage.defaultDurationDays} dia(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Mover para cima"
                    disabled={group.stages[0]._id === stage._id}
                    onClick={() => handleMoveStageWithinGroup(group, stage, -1)}
                    className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Mover para baixo"
                    disabled={group.stages[group.stages.length - 1]._id === stage._id}
                    onClick={() => handleMoveStageWithinGroup(group, stage, 1)}
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
                    onClick={() => handleToggleStageActive(stage)}
                    className="text-sm text-gray-500 hover:text-gray-800"
                  >
                    {stage.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => handleDeleteStage(stage._id)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
```

Add this derived value and the new handler inside the component, right
after the `handleMoveStage` function (which this replaces — delete
`handleMoveStage` entirely, it's superseded):

```typescript
  interface StageGroup {
    key: string;
    label: string;
    phase: Phase | null;
    stages: StageTemplate[];
  }

  const stageGroups: StageGroup[] = [
    ...phases.map((phase) => ({
      key: phase._id,
      label: phase.name,
      phase,
      stages: stages.filter((s) => s.phaseId === phase._id),
    })),
    {
      key: 'none',
      label: 'Sem fase',
      phase: null,
      stages: stages.filter((s) => !s.phaseId || !phases.some((p) => p._id === s.phaseId)),
    },
  ].filter((group) => group.stages.length > 0);

  async function handleMoveStageWithinGroup(
    group: StageGroup,
    stage: StageTemplate,
    direction: -1 | 1,
  ) {
    if (!serviceTypeId) return;
    const groupIds = group.stages.map((s) => s._id);
    const indexInGroup = groupIds.indexOf(stage._id);
    const targetIndexInGroup = indexInGroup + direction;
    if (targetIndexInGroup < 0 || targetIndexInGroup >= groupIds.length) return;
    [groupIds[indexInGroup], groupIds[targetIndexInGroup]] = [
      groupIds[targetIndexInGroup],
      groupIds[indexInGroup],
    ];

    // Flatten every group back in (phase order, then in-group order) —
    // this becomes the new flat `order` sequence the backend stores,
    // matching what the grouped UI displays.
    const flattened = stageGroups.flatMap((g) => (g.key === group.key ? groupIds : g.stages.map((s) => s._id)));
    await reorderStageTemplates(serviceTypeId, flattened);
    refresh();
  }
```

Also remove the now-unused `handleMoveStage` function body (superseded
by `handleMoveStageWithinGroup`) and update the `StageTemplateModal`
usage to pass `phases`:

```typescript
      {modalStage && (
        <StageTemplateModal
          initial={modalStage === 'new' ? undefined : modalStage}
          phases={phases}
          onClose={() => setModalStage(null)}
          onSave={handleSaveStage}
        />
      )}
```

(this was already written this way in Task 6, so this step only
confirms it stays — no further edit needed here if Task 6 already
added the `phases` prop).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/pages/StageTemplatesPage.test.tsx` (from `frontend/`)
Expected: PASS (6 tests total).

- [ ] **Step 6: Type-check and build the frontend**

Run: `npm run build --prefix frontend`
Expected: succeeds with no TypeScript errors — this is the first point
where `StageTemplateModal`'s `phases` prop requirement (added in this
task) lines up with the `<StageTemplateModal phases={phases} ... />`
call site (added in Task 6), so both halves are now consistent.

- [ ] **Step 7: Run the full frontend suite**

Run: `npm test --prefix frontend`
Expected: PASS, all files green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/StageTemplateModal.tsx frontend/src/pages/StageTemplatesPage.tsx frontend/src/pages/StageTemplatesPage.test.tsx
git commit -m "feat(frontend): group etapas by fase with per-group reordering"
```

---

## Task 8: Full-stack verification

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

Start the backend and frontend (needs a real `MONGODB_URI`), log in as
admin, open a seeded tipo de serviço (e.g. Social Media) at
`/tipos-servico/:id/etapas`, and confirm: creating a Fase shows it with
its color and day range; creating/editing an etapa lets you assign it
to that Fase and it appears grouped under the Fase heading; moving an
etapa up/down within its group doesn't reorder etapas in other groups;
archiving a Fase or an etapa shows "(arquivada)" without deleting it;
deleting a Fase moves its etapas into "Sem fase" without deleting them;
creating a project still generates only active, non-disabled etapas as
tasks in the Gantt.
