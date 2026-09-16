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
      setor: dto.setor,
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
