import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ServiceTypesModule } from './service-types/service-types.module.js';
import { StageTemplatesModule } from './stage-templates/stage-templates.module.js';
import { PhasesModule } from './phases/phases.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { SeedServiceTemplatesService } from './service-types/seed-service-templates.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    UsersModule,
    ServiceTypesModule,
    StageTemplatesModule,
    PhasesModule,
    ClientsModule,
    ProjectsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedServiceTemplatesService],
})
export class AppModule {}
