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

    // A name distinct from the 5 flows SeedServiceTemplatesService creates
    // on every app boot.
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Social Media Ads ${Date.now()}-${Math.random()}` });
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
