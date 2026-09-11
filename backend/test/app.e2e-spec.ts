import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('AppController (e2e)', () => {
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
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });
});
