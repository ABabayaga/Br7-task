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

    // Unique per beforeEach run: ServiceType.name is globally unique and
    // the in-memory Mongo instance persists across the two `it` blocks
    // in this file, so a fixed name would collide on the second run.
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Social Media ${Date.now()}-${Math.random()}` });
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
