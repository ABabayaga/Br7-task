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
