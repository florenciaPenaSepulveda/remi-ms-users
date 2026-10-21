import { User, UserDocument } from 'src/users/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login-dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async validateUser(LoginDto: LoginDto) {
    const { email, password: pass } = LoginDto;
    const user = await this.usersService.findByEmail(email);

    if (!user)
      throw new RpcException({
        status: 401,
        message: 'Credenciales inválidas',
      });

    const isValid = await bcrypt.compare(pass, user.password);

    if (!isValid)
      throw new RpcException({
        status: 401,
        message: 'Credenciales inválidas',
      });

    const { password, ...rest } = user.toObject();
    return rest;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user._id };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;

      if (!isValidObjectId(userId)) {
        throw new RpcException({ status: 400, message: 'ID inválido' });
      }

      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new RpcException({
          status: 404,
          message: 'Usuario no encontrado',
        });
      }

      // ✅ Ahora `_id` está perfectamente tipado
      return { userId: user._id.toString(), email: user.email };
    } catch (err) {
      throw new RpcException({
        status: 401,
        message: 'Token inválido o expirado',
      });
    }
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken);
      const newAccessToken = this.jwtService.sign(
        { email: payload.email, sub: payload.sub },
        { expiresIn: '60m' },
      );

      return { accessToken: newAccessToken };
    } catch (err) {
      throw new RpcException({
        status: 401,
        message: 'Refresh token inválido',
      });
    }
  }
}
