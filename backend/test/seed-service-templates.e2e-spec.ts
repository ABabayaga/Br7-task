import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { startTestDb } from './test-db.helper.js';

describe('Seed service templates (e2e)', () => {
  let app: INestApplication<App>;
  let stopDb: () => Promise<void>;
  let token: string;

  beforeAll(async () => {
    ({ stop: stopDb } = await startTestDb());

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    // onApplicationBootstrap (admin seed + service template seed) only
    // runs on init(), so a single boot is enough to seed the whole file.
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@br7.com', password: 'test-admin-password' });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await stopDb();
  });

  it('seeds all 5 flows from the PDF as service types', async () => {
    const list = await request(app.getHttpServer())
      .get('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const names = list.body.map((s: { name: string }) => s.name).sort();
    expect(names).toEqual(
      [
        'Captação de Vídeo Externa',
        'Captação de Vídeo Local',
        'Logo / Identidade Visual',
        'Site',
        'Social Media',
      ].sort(),
    );
  });

  it('seeds the Social Media stages in order with the expected first and last stage', async () => {
    const serviceTypes = await request(app.getHttpServer())
      .get('/service-types')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const socialMedia = serviceTypes.body.find((s: { name: string }) => s.name === 'Social Media');

    const stages = await request(app.getHttpServer())
      .get(`/service-types/${socialMedia._id}/stage-templates`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(stages.body).toHaveLength(11);
    expect(stages.body[0].name).toBe('Briefing interno');
    expect(stages.body[0].order).toBe(0);
    expect(stages.body[10].name).toBe('Cronograma concluído');
    expect(stages.body[10].defaultDurationDays).toBe(1);
  });
});
