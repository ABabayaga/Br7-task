# BR7 Tasks — Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NestJS + Mongoose REST API (auth, users, projects, tasks with dependency-cycle validation) that the BR7 Tasks frontend will consume.

**Architecture:** Extend the existing NestJS scaffold in `backend/`. Add `AuthModule` (JWT issued/verified via `@nestjs/jwt`, no Passport) and `UsersModule`, then flesh out the already-scaffolded `ProjectsModule`/`TasksModule`. A global `JwtAuthGuard` protects every route except those marked `@Public()`. Tests run against an in-memory MongoDB (`mongodb-memory-server`) so no real database is needed to develop or CI this.

**Tech Stack:** NestJS 12, Mongoose (`@nestjs/mongoose`), `@nestjs/config`, `@nestjs/jwt`, `bcryptjs`, `class-validator`/`class-transformer`, Vitest (unit `*.spec.ts`, e2e `*.e2e-spec.ts`), `mongodb-memory-server` (dev, for e2e).

**Spec:** `docs/superpowers/specs/2026-09-11-gantt-tasks-design.md`

## Global Constraints

- Node ESM with `nodenext` module resolution — every relative import must include the `.js` extension (e.g. `from './app.service.js'`), even though the source file is `.ts`.
- TypeScript `strict: true` (see `backend/tsconfig.json`).
- Prettier: single quotes, trailing commas everywhere (`backend/.prettierrc`) — run `npm run format` if unsure.
- All request bodies validated via `class-validator` DTOs; enable a global `ValidationPipe` with `whitelist: true` and `transform: true`.
- Unit tests: Vitest, file suffix `.spec.ts`, colocated next to the code under test. Run via `npm run test`.
- E2E tests: Vitest, file suffix `.e2e-spec.ts`, under `backend/test/`. Run via `npm run test:e2e`.
- MongoDB connection string comes from `MONGODB_URI` env var (already set in `backend/.env`, which is git-ignored).
- No Passport — JWT auth is a plain `@nestjs/jwt` guard reading `Authorization: Bearer <token>`.
- Dependency-cycle validation is mandatory whenever a task's `dependencies` field is updated.

---

## File Structure

```
backend/
  .env.example                       (new — documents required env vars, tracked in git)
  src/
    app.module.ts                    (modify — wire Config/Mongoose/Auth/Users)
    main.ts                          (modify — global ValidationPipe, CORS, PORT)
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.service.spec.ts
      jwt-auth.guard.ts
      public.decorator.ts
      roles.decorator.ts
      roles.guard.ts
      dto/login.dto.ts
    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      users.service.spec.ts
      schemas/user.schema.ts
      dto/create-user.dto.ts
      seed-admin.service.ts
    projects/
      projects.module.ts             (modify)
      projects.controller.ts         (modify)
      projects.service.ts            (modify)
      projects.service.spec.ts
      schemas/project.schema.ts
      dto/create-project.dto.ts
      dto/update-project.dto.ts
    tasks/
      tasks.module.ts                (modify)
      tasks.controller.ts            (modify)
      tasks.service.ts               (modify)
      tasks.service.spec.ts
      schemas/task.schema.ts
      dto/create-task.dto.ts
      dto/update-task.dto.ts
      dependency-cycle.util.ts
      dependency-cycle.util.spec.ts
  test/
    test-db.helper.ts                (new — mongodb-memory-server bootstrap for e2e)
    app.e2e-spec.ts                  (modify — use the in-memory DB helper)
    auth.e2e-spec.ts
    users.e2e-spec.ts
    projects.e2e-spec.ts
    tasks.e2e-spec.ts
```

---

### Task 1: Dependencies, Mongo/Config wiring, e2e test-DB helper

**Files:**
- Modify: `backend/package.json` (via `npm install`)
- Create: `backend/.env.example`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/test-db.helper.ts`
- Modify: `backend/test/app.e2e-spec.ts`

**Interfaces:**
- Produces: `startTestDb(): Promise<{ uri: string; stop: () => Promise<void> }>` — every later e2e test imports this from `../test/test-db.helper.js`.

- [ ] **Step 1: Install runtime and dev dependencies**

Run:
```bash
cd backend
npm install @nestjs/jwt bcryptjs
npm install -D mongodb-memory-server @types/bcryptjs
```

- [ ] **Step 2: Document required env vars**

Create `backend/.env.example`:
```
MONGODB_URI=mongodb://localhost:27017/br7-tasks
JWT_SECRET=change-me-in-.env
ADMIN_EMAIL=admin@br7.com
ADMIN_PASSWORD=change-me-in-.env
PORT=3000
```

Append `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (with real values of your choosing) to `backend/.env` (git-ignored, not committed).

- [ ] **Step 3: Write the e2e in-memory Mongo helper**

Create `backend/test/test-db.helper.ts`:
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startTestDb(): Promise<{
  uri: string;
  stop: () => Promise<void>;
}> {
  const server = await MongoMemoryServer.create();
  const uri = server.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'test-secret';
  process.env.ADMIN_EMAIL = 'admin@br7.com';
  process.env.ADMIN_PASSWORD = 'test-admin-password';
  return { uri, stop: () => server.stop() };
}
```

Note: the package export is `MongoMemoryServer` from `mongodb-memory-server` — verify this after `npm install` by checking `node_modules/mongodb-memory-server/README.md` if the import fails.

- [ ] **Step 4: Wire Config + Mongoose into `app.module.ts`**

Replace `backend/src/app.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    ProjectsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

(`AuthModule`/`UsersModule` are added to this `imports` array in Task 2 and Task 3 — don't forget to come back and add them then.)

- [ ] **Step 5: Update the existing e2e smoke test to use the in-memory DB**

Replace `backend/test/app.e2e-spec.ts`:
```typescript
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
```

- [ ] **Step 6: Run the e2e test to verify the app still boots**

Run: `npm run test:e2e`
Expected: PASS (the `/ (GET)` test succeeds, confirming Mongo connects via the in-memory server).

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example backend/src/app.module.ts backend/test/test-db.helper.ts backend/test/app.e2e-spec.ts
git commit -m "chore: wire Mongoose/Config, add in-memory Mongo e2e helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: User schema, UsersService, admin bootstrap seed

**Files:**
- Create: `backend/src/users/schemas/user.schema.ts`
- Create: `backend/src/users/dto/create-user.dto.ts`
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/users/users.service.spec.ts`
- Create: `backend/src/users/seed-admin.service.ts`
- Create: `backend/src/users/users.module.ts`
- Modify: `backend/src/app.module.ts` (add `UsersModule` to imports)

**Interfaces:**
- Produces: `UserDocument` (Mongoose document with `_id`, `name`, `email`, `passwordHash`, `role: 'admin' | 'member'`).
- Produces: `UsersService.create(dto: CreateUserDto): Promise<UserDocument>`, `UsersService.findByEmail(email: string): Promise<UserDocument | null>`, `UsersService.findAll(): Promise<UserDocument[]>`, `UsersService.count(): Promise<number>` — `AuthModule` (Task 3) calls `findByEmail`; `SeedAdminService` calls `count`/`create`.
- Consumes: nothing from earlier tasks besides the Mongoose connection from Task 1.

- [ ] **Step 1: Write the User schema**

Create `backend/src/users/schemas/user.schema.ts`:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserRole = 'admin' | 'member';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['admin', 'member'], default: 'member' })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

- [ ] **Step 2: Write the CreateUserDto**

Create `backend/src/users/dto/create-user.dto.ts`:
```typescript
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { UserRole } from '../schemas/user.schema.js';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: UserRole;
}
```

- [ ] **Step 3: Write the failing unit test for UsersService**

Create `backend/src/users/users.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { User } from './schemas/user.schema.js';

describe('UsersService', () => {
  let service: UsersService;
  const modelMock = {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: modelMock },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('hashes the password before creating the user', async () => {
    modelMock.create.mockResolvedValue({ _id: '1', email: 'a@b.com' });

    await service.create({
      name: 'Alef',
      email: 'a@b.com',
      password: 'supersecret',
    });

    const createArg = modelMock.create.mock.calls[0][0];
    expect(createArg.passwordHash).toBeDefined();
    expect(createArg.passwordHash).not.toBe('supersecret');
    expect(createArg.email).toBe('a@b.com');
  });

  it('findByEmail delegates to the model', async () => {
    modelMock.findOne.mockResolvedValue({ _id: '1', email: 'a@b.com' });

    const result = await service.findByEmail('a@b.com');

    expect(modelMock.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(result?.email).toBe('a@b.com');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && npm run test -- users.service.spec.ts`
Expected: FAIL with "Cannot find module './users.service.js'" (it doesn't exist yet).

- [ ] **Step 5: Implement UsersService**

Create `backend/src/users/users.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.userModel.create({
      name: dto.name,
      email: dto.email,
      role: dto.role ?? 'member',
      passwordHash,
    });
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }) as Promise<UserDocument | null>;
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash') as Promise<UserDocument[]>;
  }

  count(): Promise<number> {
    return this.userModel.countDocuments();
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npm run test -- users.service.spec.ts`
Expected: PASS

- [ ] **Step 7: Write the admin bootstrap seed service**

Create `backend/src/users/seed-admin.service.ts`:
```typescript
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
```

- [ ] **Step 8: Wire the UsersModule**

Create `backend/src/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { SeedAdminService } from './seed-admin.service.js';
import { User, UserSchema } from './schemas/user.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersService, SeedAdminService],
  exports: [UsersService],
})
export class UsersModule {}
```

(`UsersController` is added in Task 4, once the auth guard exists to protect it — this module is import-only for now.)

- [ ] **Step 9: Add UsersModule to AppModule imports**

In `backend/src/app.module.ts`, add the import and add `UsersModule` to the `imports` array (alongside `ProjectsModule`, `TasksModule`):
```typescript
import { UsersModule } from './users/users.module.js';
// ...
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  MongooseModule.forRootAsync({ /* unchanged */ }),
  UsersModule,
  ProjectsModule,
  TasksModule,
],
```

- [ ] **Step 10: Run all backend tests to confirm nothing broke**

Run: `cd backend && npm run test && npm run test:e2e`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add backend/src/users backend/src/app.module.ts
git commit -m "feat: add User schema, UsersService, admin bootstrap seed

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Auth module — login, JWT guard, roles guard

**Files:**
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.service.spec.ts`
- Create: `backend/src/auth/public.decorator.ts`
- Create: `backend/src/auth/jwt-auth.guard.ts`
- Create: `backend/src/auth/roles.decorator.ts`
- Create: `backend/src/auth/roles.guard.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts` (add `AuthModule` to imports)
- Modify: `backend/src/app.controller.ts` (mark root route `@Public()`)
- Create: `backend/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `UsersService.findByEmail` (Task 2).
- Produces: `@Public()` decorator and `@Roles('admin')` decorator — Task 4 (`UsersController`) and every later controller use these; `JwtAuthGuard` is registered globally so no controller needs to reference it directly. Authenticated request handlers read `request.user` as `{ sub: string; email: string; role: 'admin' | 'member' }`.

- [ ] **Step 1: Write the LoginDto**

Create `backend/src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 2: Write the failing unit test for AuthService**

Create `backend/src/auth/auth.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const usersServiceMock = { findByEmail: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('returns a token when credentials are valid', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    usersServiceMock.findByEmail.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      email: 'a@b.com',
      role: 'member',
      passwordHash,
    });

    const result = await service.login('a@b.com', 'correct-password');

    expect(result.accessToken).toBeTruthy();
  });

  it('throws UnauthorizedException for a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    usersServiceMock.findByEmail.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      email: 'a@b.com',
      role: 'member',
      passwordHash,
    });

    await expect(service.login('a@b.com', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the user does not exist', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(null);

    await expect(service.login('nobody@b.com', 'anything')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npm run test -- auth.service.spec.ts`
Expected: FAIL with "Cannot find module './auth.service.js'"

- [ ] **Step 4: Implement AuthService**

Create `backend/src/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npm run test -- auth.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Write the `@Public()` decorator**

Create `backend/src/auth/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 7: Write the global JwtAuthGuard**

Create `backend/src/auth/jwt-auth.guard.ts`:
```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: 'admin' | 'member';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

- [ ] **Step 8: Write the `@Roles()` decorator and RolesGuard**

Create `backend/src/auth/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'admin' | 'member'>) => SetMetadata(ROLES_KEY, roles);
```

Create `backend/src/auth/roles.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedUser } from './jwt-auth.guard.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<'admin' | 'member'>>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
```

- [ ] **Step 9: Write the AuthController**

Create `backend/src/auth/auth.controller.ts`:
```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
```

- [ ] **Step 10: Wire the AuthModule with the global guard**

Create `backend/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
```

- [ ] **Step 11: Mark the root route `@Public()` and add AuthModule to AppModule**

In `backend/src/app.controller.ts`, add the decorator:
```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './auth/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

In `backend/src/app.module.ts`, add `AuthModule` to the `imports` array and import it at the top:
```typescript
import { AuthModule } from './auth/auth.module.js';
// ...
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  MongooseModule.forRootAsync({ /* unchanged */ }),
  AuthModule,
  UsersModule,
  ProjectsModule,
  TasksModule,
],
```

- [ ] **Step 12: Write the e2e test for login**

Create `backend/test/auth.e2e-spec.ts`:
```typescript
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

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(app.getHttpServer()).get('/projects').expect(401);
  });
});
```

- [ ] **Step 13: Run all backend tests**

Run: `cd backend && npm run test && npm run test:e2e`
Expected: PASS. (The third `auth.e2e-spec.ts` case assumes `GET /projects` exists and is guarded — it does, from the current scaffold, and the global guard now protects it.)

- [ ] **Step 14: Commit**

```bash
git add backend/src/auth backend/src/app.module.ts backend/src/app.controller.ts backend/test/auth.e2e-spec.ts
git commit -m "feat: add JWT auth (login, global guard, roles guard)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: UsersController (admin-create, list) + e2e

**Files:**
- Create: `backend/src/users/users.controller.ts`
- Modify: `backend/src/users/users.module.ts` (register controller)
- Create: `backend/test/users.e2e-spec.ts`

**Interfaces:**
- Consumes: `UsersService` (Task 2), `@Roles`/`Public` (Task 3).
- Produces: `GET /users` (any authenticated user), `POST /users` (admin only) — the frontend's assignee picker (frontend plan) calls `GET /users`.

- [ ] **Step 1: Write the UsersController**

Create `backend/src/users/users.controller.ts`:
```typescript
import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

(`RolesGuard` is already registered globally via `APP_GUARD` in Task 3 — `@Roles('admin')` alone is enough; no per-route `@UseGuards` needed.)

- [ ] **Step 2: Register the controller in UsersModule**

In `backend/src/users/users.module.ts`, import and add to `controllers`:
```typescript
import { UsersController } from './users.controller.js';
// ...
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService, SeedAdminService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 3: Write the e2e test**

Create `backend/test/users.e2e-spec.ts`:
```typescript
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

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Member', email: 'member@br7.com', password: 'member-password' });

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@br7.com', password: 'member-password' });
    memberToken = memberLogin.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await stopDb();
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
```

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && npm run test && npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/users backend/test/users.e2e-spec.ts
git commit -m "feat: add UsersController (list, admin-only create)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Project schema + full ProjectsService/Controller CRUD

**Files:**
- Create: `backend/src/projects/schemas/project.schema.ts`
- Create: `backend/src/projects/dto/create-project.dto.ts`
- Create: `backend/src/projects/dto/update-project.dto.ts`
- Modify: `backend/src/projects/projects.service.ts`
- Create: `backend/src/projects/projects.service.spec.ts`
- Modify: `backend/src/projects/projects.controller.ts`
- Modify: `backend/src/projects/projects.module.ts`
- Create: `backend/test/projects.e2e-spec.ts`

**Interfaces:**
- Produces: `ProjectDocument`, `ProjectsService.create/findAll/findOne/update/remove` — Task 6 (`TasksService`) calls `ProjectsService.findOne` to validate a `projectId` exists before creating a task.

- [ ] **Step 1: Write the Project schema**

Create `backend/src/projects/schemas/project.schema.ts`:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProjectStatus = 'active' | 'archived';
export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: ['active', 'archived'], default: 'active' })
  status: ProjectStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
```

- [ ] **Step 2: Write the DTOs**

Create `backend/src/projects/dto/create-project.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

Create `backend/src/projects/dto/update-project.dto.ts`:
```typescript
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ProjectStatus } from '../schemas/project.schema.js';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: ProjectStatus;
}
```

- [ ] **Step 3: Write the failing unit test for ProjectsService**

Create `backend/src/projects/projects.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { Project } from './schemas/project.schema.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: modelMock },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  it('creates a project with createdBy set', async () => {
    modelMock.create.mockResolvedValue({ _id: '1', name: 'Campanha X' });

    await service.create({ name: 'Campanha X' }, 'user-1');

    expect(modelMock.create).toHaveBeenCalledWith({
      name: 'Campanha X',
      description: undefined,
      createdBy: 'user-1',
    });
  });

  it('throws NotFoundException when the project does not exist', async () => {
    modelMock.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && npm run test -- projects.service.spec.ts`
Expected: FAIL (current `ProjectsService` is empty).

- [ ] **Step 5: Implement ProjectsService**

Replace `backend/src/projects/projects.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  create(dto: CreateProjectDto, createdBy: string) {
    return this.projectModel.create({
      name: dto.name,
      description: dto.description,
      createdBy,
    });
  }

  findAll(): Promise<ProjectDocument[]> {
    return this.projectModel.find() as Promise<ProjectDocument[]>;
  }

  async findOne(id: string): Promise<ProjectDocument> {
    const project = (await this.projectModel.findById(id)) as ProjectDocument | null;
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectDocument> {
    const project = (await this.projectModel.findByIdAndUpdate(id, dto, {
      new: true,
    })) as ProjectDocument | null;
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npm run test -- projects.service.spec.ts`
Expected: PASS

- [ ] **Step 7: Implement ProjectsController**

Replace `backend/src/projects/projects.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.projectsService.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
```

- [ ] **Step 8: Wire ProjectsModule with Mongoose feature**

Replace `backend/src/projects/projects.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { Project, ProjectSchema } from './schemas/project.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }])],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

- [ ] **Step 9: Write the e2e test**

Create `backend/test/projects.e2e-spec.ts`:
```typescript
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

  it('creates, reads, updates (archives) and deletes a project', async () => {
    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Campanha X', description: 'Lançamento Q4' })
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
});
```

- [ ] **Step 10: Run all backend tests**

Run: `cd backend && npm run test && npm run test:e2e`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add backend/src/projects backend/test/projects.e2e-spec.ts
git commit -m "feat: add Project schema and full ProjectsService/Controller CRUD

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Task schema, dependency-cycle validation, TasksService/Controller CRUD

**Files:**
- Create: `backend/src/tasks/schemas/task.schema.ts`
- Create: `backend/src/tasks/dependency-cycle.util.ts`
- Create: `backend/src/tasks/dependency-cycle.util.spec.ts`
- Create: `backend/src/tasks/dto/create-task.dto.ts`
- Create: `backend/src/tasks/dto/update-task.dto.ts`
- Modify: `backend/src/tasks/tasks.service.ts`
- Create: `backend/src/tasks/tasks.service.spec.ts`
- Modify: `backend/src/tasks/tasks.controller.ts`
- Modify: `backend/src/tasks/tasks.module.ts`
- Create: `backend/test/tasks.e2e-spec.ts`

**Interfaces:**
- Consumes: `ProjectsService.findOne` (Task 5), `wouldCreateCycle` (this task, used internally by `TasksService`).
- Produces: `GET/POST /projects/:id/tasks`, `PATCH/DELETE /tasks/:id` — the frontend Gantt view (frontend plan) is the sole consumer.

- [ ] **Step 1: Write the failing unit test for the cycle-detection util**

Create `backend/src/tasks/dependency-cycle.util.spec.ts`:
```typescript
import { wouldCreateCycle } from './dependency-cycle.util.js';

describe('wouldCreateCycle', () => {
  it('returns false when there is no cycle', () => {
    const allTasks = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: ['a'] },
    ];
    expect(wouldCreateCycle('b', ['a'], allTasks)).toBe(false);
  });

  it('returns true for a direct self-dependency', () => {
    const allTasks = [{ id: 'a', dependencies: [] }];
    expect(wouldCreateCycle('a', ['a'], allTasks)).toBe(true);
  });

  it('returns true for a transitive cycle (a -> b -> c -> a)', () => {
    const allTasks = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['b'] },
    ];
    // Proposing that 'a' depends on 'c' closes the loop a -> c -> b -> a.
    expect(wouldCreateCycle('a', ['c'], allTasks)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npm run test -- dependency-cycle.util.spec.ts`
Expected: FAIL with "Cannot find module './dependency-cycle.util.js'"

- [ ] **Step 3: Implement the cycle-detection util**

Create `backend/src/tasks/dependency-cycle.util.ts`:
```typescript
export interface TaskNode {
  id: string;
  dependencies: string[];
}

/**
 * Given the proposed new `dependencies` list for `taskId`, returns true if
 * applying it would create a cycle anywhere reachable from `taskId` in the
 * project's dependency graph.
 */
export function wouldCreateCycle(
  taskId: string,
  newDependencies: string[],
  allTasks: TaskNode[],
): boolean {
  const graph = new Map<string, string[]>();
  for (const task of allTasks) {
    graph.set(task.id, task.id === taskId ? newDependencies : task.dependencies);
  }
  if (!graph.has(taskId)) {
    graph.set(taskId, newDependencies);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function hasCycle(node: string): boolean {
    if (visited.has(node)) return false;
    if (visiting.has(node)) return true;

    visiting.add(node);
    for (const dep of graph.get(node) ?? []) {
      if (hasCycle(dep)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return hasCycle(taskId);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npm run test -- dependency-cycle.util.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the Task schema**

Create `backend/src/tasks/schemas/task.schema.ts`:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  progress: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assigneeId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  dependencies: Types.ObjectId[];

  @Prop({ required: true, enum: ['todo', 'in_progress', 'done'], default: 'todo' })
  status: TaskStatus;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
```

- [ ] **Step 6: Write the DTOs**

Create `backend/src/tasks/dto/create-task.dto.ts`:
```typescript
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}
```

Create `backend/src/tasks/dto/update-task.dto.ts`:
```typescript
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { TaskStatus } from '../schemas/task.schema.js';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'done'])
  status?: TaskStatus;
}
```

- [ ] **Step 7: Write the failing unit test for TasksService**

Create `backend/src/tasks/tasks.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { Task } from './schemas/task.schema.js';

describe('TasksService', () => {
  let service: TasksService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateMany: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TasksService, { provide: getModelToken(Task.name), useValue: modelMock }],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  it('rejects an update that would create a dependency cycle', async () => {
    const taskA = { _id: 'a', projectId: 'p1', dependencies: [] };
    const taskB = { _id: 'b', projectId: 'p1', dependencies: ['a'] };
    modelMock.findById.mockResolvedValue(taskA);
    modelMock.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([taskA, taskB]),
    });

    // Proposing that 'a' now depends on 'b' would create a -> b -> a.
    await expect(service.update('a', { dependencies: ['b'] })).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `cd backend && npm run test -- tasks.service.spec.ts`
Expected: FAIL (current `TasksService` is empty).

- [ ] **Step 9: Implement TasksService**

Replace `backend/src/tasks/tasks.service.ts`:
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { wouldCreateCycle } from './dependency-cycle.util.js';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private readonly taskModel: Model<Task>) {}

  create(projectId: string, dto: CreateTaskDto) {
    return this.taskModel.create({
      name: dto.name,
      projectId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      assigneeId: dto.assigneeId,
    });
  }

  findAllForProject(projectId: string): Promise<TaskDocument[]> {
    return this.taskModel.find({ projectId }) as Promise<TaskDocument[]>;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const task = (await this.taskModel.findById(id)) as TaskDocument | null;
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    if (dto.dependencies) {
      const projectTasks = await this.taskModel
        .find({ projectId: task.projectId })
        .lean();
      const allTasks = projectTasks.map((t) => ({
        id: t._id.toString(),
        dependencies: t.dependencies.map((d) => d.toString()),
      }));

      if (wouldCreateCycle(id, dto.dependencies, allTasks)) {
        throw new BadRequestException('This would create a dependency cycle');
      }
    }

    const updated = (await this.taskModel.findByIdAndUpdate(id, dto, {
      new: true,
    })) as TaskDocument | null;
    if (!updated) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const task = await this.taskModel.findByIdAndDelete(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    await this.taskModel.updateMany(
      { projectId: task.projectId },
      { $pull: { dependencies: task._id } },
    );
  }
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd backend && npm run test -- tasks.service.spec.ts`
Expected: PASS

- [ ] **Step 11: Implement TasksController**

Replace `backend/src/tasks/tasks.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  findAllForProject(@Param('projectId') projectId: string) {
    return this.tasksService.findAllForProject(projectId);
  }

  @Post('projects/:projectId/tasks')
  create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(projectId, dto);
  }

  @Patch('tasks/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
```

- [ ] **Step 12: Wire TasksModule with Mongoose feature**

Replace `backend/src/tasks/tasks.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { Task, TaskSchema } from './schemas/task.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
```

- [ ] **Step 13: Write the e2e test covering CRUD, cycle rejection, and delete cleanup**

Create `backend/test/tasks.e2e-spec.ts`:
```typescript
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
```

- [ ] **Step 14: Run all backend tests**

Run: `cd backend && npm run test && npm run test:e2e`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add backend/src/tasks backend/test/tasks.e2e-spec.ts
git commit -m "feat: add Task schema, dependency-cycle validation, full CRUD

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Global ValidationPipe, CORS, PORT — production `main.ts`

**Files:**
- Modify: `backend/src/main.ts`

**Interfaces:**
- Consumes: nothing new — this only affects the bootstrapped app, not test modules (which already set up `ValidationPipe` per-test in Tasks 3–6).

- [ ] **Step 1: Update `main.ts`**

Replace `backend/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

- [ ] **Step 2: Add `FRONTEND_ORIGIN` to `.env.example`**

In `backend/.env.example`, append:
```
FRONTEND_ORIGIN=http://localhost:5173
```

- [ ] **Step 3: Verify the app still boots and all tests still pass**

Run: `cd backend && npm run test && npm run test:e2e`
Expected: PASS

Run: `cd backend && npm run start:dev` (manual smoke check), then in another terminal:
```bash
curl http://localhost:3000/
```
Expected: `Hello World!`. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main.ts backend/.env.example
git commit -m "chore: enable global validation and CORS for the frontend origin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** Auth/login (Task 3), Users CRUD + admin-only create (Task 2, 4), Projects CRUD (Task 5), Tasks CRUD + dependency-cycle validation + delete cleanup (Task 6), CORS/validation for the frontend to consume (Task 7) — every backend requirement in the spec maps to a task.
- **Type consistency checked:** `AuthenticatedUser` (`sub`, `email`, `role`) defined once in `jwt-auth.guard.ts` and reused verbatim in `roles.guard.ts` and `projects.controller.ts`. `TaskNode` shape (`id`, `dependencies: string[]`) matches what `TasksService.update` builds from `.lean()` results. DTO field names match schema property names throughout.
- **No placeholders:** every step has runnable code; no "TBD"/"add validation" left unresolved.
