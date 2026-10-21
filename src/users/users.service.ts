import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { RpcException } from '@nestjs/microservices';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verificar si el usuario ya existe
    const existingUser = await this.userModel
      .findOne({ email: createUserDto.email })
      .exec();

    if (existingUser) {
      throw new RpcException({
        status: 409,
        message: 'El usuario con este correo ya existe',
      });
    }

    // 🔐 Encriptar la contraseña antes de guardar
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // Crear nuevo usuario con contraseña encriptada
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    console.log('✅ Usuario creado:', createdUser.email);

    return createdUser.save();
  }

  // src/users/users.service.ts
  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findAll() {
    const users = this.userModel.find().exec();
    if (!users)
      throw new RpcException({
        status: 404,
        message: '❌Usuarios no encontrados',
      });
    return users;
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user)
      throw new RpcException({
        status: 404,
        message: '❌Usuario no encontrado',
      });
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const updated = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!updated)
      throw new RpcException({
        status: 404,
        message: '❌Usuario no encontrado',
      });
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.userModel.findByIdAndDelete(id).exec();
    if (!deleted)
      throw new RpcException({
        status: 404,
        message: '❌Usuario no encontrado',
      });
    return deleted;
  }
}
