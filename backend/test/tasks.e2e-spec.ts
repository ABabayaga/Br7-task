import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;
  let projectId: string;

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

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Campanha X' });
    projectId = project.body._id;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('creates two tasks, links a dependency, rejects a cycle, and cleans up on delete', async () => {
    const taskA = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Briefing', startDate: '2026-01-01', endDate: '2026-01-05' })
      .expect(201);

    const taskB = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Produção', startDate: '2026-01-06', endDate: '2026-01-10' })
      .expect(201);

    // B depends on A — fine.
    const updatedB = await request(app.getHttpServer())
      .patch(`/tasks/${taskB.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dependencies: [taskA.body._id] })
      .expect(200);
    expect(updatedB.body.dependencies).toContain(taskA.body._id);

    // Now proposing A depends on B would close a cycle — rejected.
    await request(app.getHttpServer())
      .patch(`/tasks/${taskA.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dependencies: [taskB.body._id] })
      .expect(400);

    // Deleting A must remove it from B's dependencies list.
    await request(app.getHttpServer())
      .delete(`/tasks/${taskA.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const remaining = list.body.find((t: { _id: string }) => t._id === taskB.body._id);
    expect(remaining.dependencies).not.toContain(taskA.body._id);
  });
});
