import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let adminToken: string;
  let memberToken: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' });
    adminToken = adminLogin.body.accessToken;

    // Unique email per test run: the in-memory DB persists across the `it`
    // blocks in this file (only `beforeAll`/`afterAll` start/stop it), so a
    // fixed email would collide on the second test's `beforeEach`.
    const memberEmail = `member-${Date.now()}-${Math.random()}@br7.com`;
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Member', email: memberEmail, password: 'member-password' });

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: memberEmail, password: 'member-password' });
    memberToken = memberLogin.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('lets a member list users but not create one', async () => {
    const list = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'X', email: 'x@br7.com', password: 'password123' })
      .expect(403);
  });
});
