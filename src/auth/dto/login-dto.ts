import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  @MaxLength(72, { message: 'La contraseña es demasiado larga' })
  password: string;
}
