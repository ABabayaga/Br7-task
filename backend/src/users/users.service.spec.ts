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
