import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { LoginDto } from 'src/users/dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ADMIN_PASSWORD } from 'src/common/constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {
    this.createAdmin();
  }

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
      throw new HttpException('존재하지 않는 ID입니다.', HttpStatus.NOT_FOUND);
    }

    const isSamePassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isSamePassword) {
      throw new HttpException(
        '비밀번호가 일치하지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
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

  async createAdmin() {
    const isIdDuplicate = await this.usersRepository.findOne({
      where: {
        id: 'admin',
      },
    });
    if (!isIdDuplicate) {
      const password = ADMIN_PASSWORD;
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = this.usersRepository.create({
        id: 'admin',
        name: '관리자',
        password: hashedPassword,
      });
      return this.usersRepository.save(admin);
    }
  }
}
