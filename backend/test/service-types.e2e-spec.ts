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
    // A name distinct from the 5 flows SeedServiceTemplatesService creates
    // on every app boot — the collection is never empty here.
    const name = `Social Media Ads ${Date.now()}-${Math.random()}`;
    const created = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    expect(created.body.active).toBe(true);

    const list = await request(app.getHttpServer())
      .get('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.map((s: { name: string }) => s.name)).toContain(name);

    const deactivated = await request(app.getHttpServer())
      .patch(`/service-types/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false })
      .expect(200);
    expect(deactivated.body.active).toBe(false);
  });
});
