import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'login_user' })
  async login(@Payload() dto: LoginDto) {
    const usuario = await this.authService.validateUser(dto);
    return this.authService.login(usuario);
  }

  @MessagePattern({ cmd: 'validate_token' })
  validateToken(@Payload() token: string) {
    return this.authService.validateToken(token);
  }

  @MessagePattern({ cmd: 'refresh_token' })
  refreshToken(@Payload() token: string) {
    return this.authService.refreshToken(token);
  }
}
