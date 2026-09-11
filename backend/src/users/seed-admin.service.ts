import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service.js';

@Injectable()
export class SeedAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedAdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.usersService.count();
    if (existing > 0) return;

    const email = this.config.getOrThrow<string>('ADMIN_EMAIL');
    const password = this.config.getOrThrow<string>('ADMIN_PASSWORD');

    await this.usersService.create({
      name: 'Admin',
      email,
      password,
      role: 'admin',
    });
    this.logger.log(`Seeded initial admin user: ${email}`);
  }
}
