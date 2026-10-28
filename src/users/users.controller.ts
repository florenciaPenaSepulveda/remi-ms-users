import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto, UsersByIdsMessage } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: 'create_user' })
  create(@Payload() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @MessagePattern({ cmd: 'get_all_users' })
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern({ cmd: 'count_users' })
  count() {
    return this.usersService.count();
  }

  @MessagePattern({ cmd: 'find_users_by_ids' })
  findMany(@Payload() { ids }: UsersByIdsMessage) {
    return this.usersService.findMany(ids);
  }

  @MessagePattern({ cmd: 'find_user_by_id' })
  findOne(@Payload() id: string) {
    return this.usersService.findOne(id);
  }
}
