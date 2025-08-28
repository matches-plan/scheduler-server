import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { LoginDto } from 'src/users/dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const isIdDuplicate = await this.usersRepository.findOne({
      where: {
        id: createUserDto.id,
      },
    });
    if (isIdDuplicate) {
      throw new Error('ID already exists');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: {
        id: loginDto.id,
      },
    });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isSamePassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isSamePassword) {
      throw new Error('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      id: user.id,
      username: user.name,
    });

    return { token };
  }

  findAll() {
    return this.usersRepository.find();
  }

  remove(id: number) {
    return this.usersRepository.delete(id);
  }
}
