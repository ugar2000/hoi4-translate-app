import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword },
    });

    const token = this.jwtService.sign({ userId: user.id });
    return { token, userId: user.id };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ userId: user.id });
    return { token, userId: user.id };
  }
}
