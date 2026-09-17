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
      .send({ name: `Social Media ${Date.now()}-${Math.random()}` });
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
      .send({ name: `Site ${Date.now()}-${Math.random()}` });

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

  it('carries the phase name/color snapshot onto generated tasks', async () => {
    const serviceType = await request(app.getHttpServer())
      .post('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Social Media ${Date.now()}-${Math.random()}` });
    const serviceTypeId = serviceType.body._id;

    const phase = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/phases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fase I', color: '#2563EB', startDay: 1, endDay: 2 });

    const stage1 = await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Briefing',
        defaultSector: 'diretoria_criacao',
        defaultDurationDays: 2,
        phaseId: phase.body._id,
      });
    await request(app.getHttpServer())
      .post(`/service-types/${serviceTypeId}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1 });

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Fases' });

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Campanha Fases',
        clientId: client.body._id,
        serviceTypeId,
        startDate: '2026-01-01',
      })
      .expect(201);

    const tasks = await request(app.getHttpServer())
      .get(`/projects/${project.body._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const briefingTask = tasks.body.find((t: { name: string }) => t.name === 'Briefing');
    const facebookTask = tasks.body.find((t: { name: string }) => t.name === 'Facebook');
    expect(briefingTask.phaseName).toBe('Fase I');
    expect(briefingTask.phaseColor).toBe('#2563EB');
    expect(facebookTask.phaseName).toBeUndefined();
    expect(stage1.body.phaseId).toBe(phase.body._id);
  });
});
