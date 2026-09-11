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
