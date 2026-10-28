import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { Model, isValidObjectId } from 'mongoose';
import { Env } from '../config/env';
import { CreateUserDto } from './dto/create-user.dto';
import { PublicUser, aPublico } from './public-user';
import { User, UserDocument } from './schemas/user.schema';

const CODIGO_DUPLICADO = 11000;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    if (await this.userModel.exists({ email: dto.email })) {
      throw this.correoRepetido();
    }
    const password = await bcrypt.hash(
      dto.password,
      this.config.get('BCRYPT_ROUNDS', { infer: true }),
    );
    try {
      const creado = await this.userModel.create({ ...dto, password });
      return aPublico(creado);
    } catch (error) {
      if ((error as { code?: number }).code === CODIGO_DUPLICADO) {
        throw this.correoRepetido();
      }
      throw error;
    }
  }

  findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findAll(): Promise<PublicUser[]> {
    const usuarios = await this.userModel.find().sort({ createdAt: 1 }).exec();
    return usuarios.map(aPublico);
  }

  async findMany(ids: string[]): Promise<PublicUser[]> {
    const usuarios = await this.userModel.find({ _id: { $in: ids } }).exec();
    return usuarios.map(aPublico);
  }

  async findOne(id: string): Promise<PublicUser> {
    if (typeof id !== 'string' || !isValidObjectId(id)) {
      throw new RpcException({
        status: 400,
        message: 'ID de usuario inválido',
      });
    }
    const usuario = await this.userModel.findById(id).exec();
    if (!usuario) {
      throw new RpcException({ status: 404, message: 'Usuario no encontrado' });
    }
    return aPublico(usuario);
  }

  private correoRepetido() {
    return new RpcException({
      status: 409,
      message: 'El usuario con este correo ya existe',
    });
  }
}
