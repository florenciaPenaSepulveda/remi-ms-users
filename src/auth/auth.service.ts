import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { Env } from '../config/env';
import { PublicUser, aPublico } from '../users/public-user';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login-dto';

type TipoDeToken = 'access' | 'refresh';

interface PayloadDelToken {
  sub: string;
  email: string;
  typ: TipoDeToken;
}

const HASH_FICTICIO = bcrypt.hashSync('contraseña-que-nadie-usa', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async validateUser({ email, password }: LoginDto): Promise<PublicUser> {
    const usuario = await this.usersService.findByEmailWithPassword(email);
    const coincide = await bcrypt.compare(
      password,
      usuario?.password ?? HASH_FICTICIO,
    );
    if (!usuario || !coincide) {
      throw this.noAutorizado('Credenciales inválidas');
    }
    return aPublico(usuario);
  }

  login(usuario: PublicUser) {
    return {
      ...this.emitirTokens(usuario),
      user: { id: usuario.id, email: usuario.email, name: usuario.name },
    };
  }

  async validateToken(token: string) {
    const payload = this.verificar(token, 'access');
    const usuario = await this.usuarioDelToken(payload);
    return { userId: usuario.id, email: usuario.email };
  }

  async refreshToken(token: string) {
    const payload = this.verificar(token, 'refresh');
    const usuario = await this.usuarioDelToken(payload);
    return this.emitirTokens(usuario);
  }

  private emitirTokens({ id, email }: PublicUser) {
    const base = { sub: id, email };
    return {
      accessToken: this.jwtService.sign(
        { ...base, typ: 'access' },
        {
          expiresIn: this.config.get('ACCESS_TOKEN_TTL', {
            infer: true,
          }),
        },
      ),
      refreshToken: this.jwtService.sign(
        { ...base, typ: 'refresh' },
        {
          expiresIn: this.config.get('REFRESH_TOKEN_TTL', {
            infer: true,
          }),
        },
      ),
    };
  }

  private verificar(token: unknown, tipo: TipoDeToken): PayloadDelToken {
    try {
      if (typeof token !== 'string') {
        throw new Error('token ausente');
      }
      const payload = this.jwtService.verify<PayloadDelToken>(token);
      if (payload.typ !== tipo) {
        throw new Error('tipo de token incorrecto');
      }
      return payload;
    } catch {
      throw this.noAutorizado(
        tipo === 'access'
          ? 'Token inválido o expirado'
          : 'Refresh token inválido',
      );
    }
  }

  private async usuarioDelToken(payload: PayloadDelToken): Promise<PublicUser> {
    try {
      return await this.usersService.findOne(payload.sub);
    } catch {
      throw this.noAutorizado('Token inválido o expirado');
    }
  }

  private noAutorizado(message: string) {
    return new RpcException({ status: 401, message });
  }
}
