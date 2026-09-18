import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;
  let clientId: string;
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

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Teste' });
    clientId = client.body._id;

    // Unique per beforeEach run: ServiceType.name is globally unique and
    // the in-memory Mongo instance persists across the two `it` blocks
    // in this file, so a fixed name would collide on the second run.
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Site ${Date.now()}-${Math.random()}` });
    serviceTypeId = serviceType.body._id;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/projects').expect(401);
  });

  it('creates, reads, updates (archives) and deletes a project', async () => {
    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Campanha X',
        description: 'Lançamento Q4',
        clientId,
        serviceTypeId,
        startDate: '2026-01-01',
      })
      .expect(201);
    const id = created.body._id;
    expect(created.body.name).toBe('Campanha X');

    await request(app.getHttpServer())
      .get(`/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const archived = await request(app.getHttpServer())
      .patch(`/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archived' })
      .expect(200);
    expect(archived.body.status).toBe('archived');

    await request(app.getHttpServer())
      .delete(`/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('creates a blank project without a service type and no generated tasks', async () => {
    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Projeto sob medida',
        clientId,
        startDate: '2026-01-01',
      })
      .expect(201);
    expect(created.body.serviceTypeId).toBeUndefined();

    const tasks = await request(app.getHttpServer())
      .get(`/projects/${created.body._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(tasks.body).toEqual([]);
  });

  it('rejects a malformed clientId with 400 instead of failing to cast it', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Projeto sem cliente',
        clientId: '',
        startDate: '2026-01-01',
      })
      .expect(400);
  });

  it('rejects a malformed serviceTypeId with 400 instead of failing to cast it', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Projeto com servico invalido',
        clientId,
        serviceTypeId: 'nao-e-um-object-id',
        startDate: '2026-01-01',
      })
      .expect(400);
  });
});
