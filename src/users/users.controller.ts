import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: 'create_user' })
  create(@Payload() createUserDto: CreateUserDto) {
    console.log('📩 Mensaje recibido para crear usuario:', createUserDto.email);
    return this.usersService.create(createUserDto);
  }

  @MessagePattern({ cmd: 'get_all_users' })
  findAll() {
    console.log('📩 Mensaje recibido para obtener todos los usuarios');
    return this.usersService.findAll();
  }

  @MessagePattern({ cmd: 'find_user_by_id' })
  findOne(@Payload() id: string) {
    console.log('📩 Mensaje recibido para obtener usuario con ID:', id);
    return this.usersService.findOne(id);
  }
}
