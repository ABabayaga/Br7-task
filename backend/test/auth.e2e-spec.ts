import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;

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
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('logs in the seeded admin and returns a token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' })
      .expect(201);

    expect(response.body.accessToken).toBeTruthy();
  });

  it('rejects wrong credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'wrong' })
      .expect(401);
  });
});

// Note: a "rejects unauthenticated request to a protected route" case is
// covered in test/users.e2e-spec.ts (Task 4) instead of here — at this
// point in the plan no protected route has a handler wired up yet
// (ProjectsController and UsersController are still empty scaffolds), so
// there's nothing non-public to hit.
