import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsMongoId,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre es obligatorio' })
  @Length(2, 60, { message: 'El nombre debe tener entre 2 y 60 caracteres' })
  name: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @Length(8, 72, {
    message: 'La contraseña debe tener entre 8 y 72 caracteres',
  })
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir una letra' })
  @Matches(/\d/, { message: 'La contraseña debe incluir un número' })
  password: string;
}

export class UsersByIdsMessage {
  @IsArray({ message: 'Los usuarios deben ser una lista' })
  @ArrayMaxSize(100, { message: 'Se admiten hasta 100 usuarios por consulta' })
  @IsMongoId({ each: true, message: 'ID de usuario inválido' })
  ids: string[];
}
