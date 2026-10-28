import { INestMicroservice } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

const PUERTO = 4871;
const usuario = {
  name: 'Ana Pérez',
  email: 'ana@remi.cl',
  password: 'Clave12345',
};

describe('Servicio de usuarios', () => {
  let app: INestMicroservice;
  let cliente: ClientProxy;
  let conexion: Connection;
  let jwt: JwtService;

  const enviar = <T = any>(cmd: string, datos: unknown = {}) =>
    firstValueFrom(cliente.send<T>({ cmd }, datos));
  const fallo = async (cmd: string, datos: unknown = {}) => {
    try {
      await enviar(cmd, datos);
    } catch (error) {
      return error as { status: number; message: string | string[] };
    }
    throw new Error('Se esperaba un error');
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarApp(
      modulo.createNestMicroservice({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: PUERTO },
      }),
    );
    await app.listen();
    cliente = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PUERTO },
    });
    await cliente.connect();
    conexion = app.get<Connection>(getConnectionToken());
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    await conexion.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await conexion.dropDatabase();
    cliente.close();
    await app.close();
  });

  describe('registro', () => {
    it('crea el usuario sin exponer la contraseña', async () => {
      const creado = await enviar('create_user', usuario);
      expect(creado).toMatchObject({ name: 'Ana Pérez', email: 'ana@remi.cl' });
      expect(creado.id).toMatch(/^[0-9a-f]{24}$/);
      expect(JSON.stringify(creado)).not.toMatch(/password|\$2[aby]\$/);
    });

    it('guarda la contraseña con hash', async () => {
      await enviar('create_user', usuario);
      const guardado = await conexion.collection('users').findOne({});
      expect(guardado?.password).toMatch(/^\$2[aby]\$/);
    });

    it('normaliza el correo a minúsculas', async () => {
      const creado = await enviar('create_user', {
        ...usuario,
        email: '  ANA@Remi.CL ',
      });
      expect(creado.email).toBe('ana@remi.cl');
    });

    it('rechaza un correo repetido con 409', async () => {
      await enviar('create_user', usuario);
      const error = await fallo('create_user', {
        ...usuario,
        email: 'ANA@remi.cl',
      });
      expect(error.status).toBe(409);
    });

    it('rechaza datos inválidos con 400 y los motivos', async () => {
      const error = await fallo('create_user', {
        name: 'A',
        email: 'no-es-correo',
        password: 'corta',
      });
      expect(error.status).toBe(400);
      expect(error.message).toEqual(
        expect.arrayContaining([
          'El nombre debe tener entre 2 y 60 caracteres',
          'El correo no es válido',
          'La contraseña debe tener entre 8 y 72 caracteres',
        ]),
      );
    });

    it('exige letra y número en la contraseña', async () => {
      const soloLetras = await fallo('create_user', {
        ...usuario,
        password: 'solamenteletras',
      });
      expect(soloLetras.message).toContain(
        'La contraseña debe incluir un número',
      );
      const soloNumeros = await fallo('create_user', {
        ...usuario,
        password: '1234567890',
      });
      expect(soloNumeros.message).toContain(
        'La contraseña debe incluir una letra',
      );
    });

    it('rechaza campos que no existen en el formulario', async () => {
      const error = await fallo('create_user', { ...usuario, role: 'admin' });
      expect(error.status).toBe(400);
    });
  });

  describe('inicio de sesión', () => {
    beforeEach(async () => {
      await enviar('create_user', usuario);
    });

    it('entrega tokens y el usuario sin contraseña', async () => {
      const sesion = await enviar('login_user', {
        email: usuario.email,
        password: usuario.password,
      });
      expect(sesion.accessToken).toEqual(expect.any(String));
      expect(sesion.refreshToken).toEqual(expect.any(String));
      expect(sesion.user).toEqual({
        id: expect.any(String),
        email: usuario.email,
        name: usuario.name,
      });
    });

    it('acepta el correo con otras mayúsculas', async () => {
      const sesion = await enviar('login_user', {
        email: 'ANA@REMI.CL',
        password: usuario.password,
      });
      expect(sesion.user.email).toBe(usuario.email);
    });

    it('responde igual ante contraseña errónea y correo desconocido', async () => {
      const mala = await fallo('login_user', {
        email: usuario.email,
        password: 'OtraClave123',
      });
      const desconocido = await fallo('login_user', {
        email: 'nadie@remi.cl',
        password: 'OtraClave123',
      });
      expect(mala).toEqual({ status: 401, message: 'Credenciales inválidas' });
      expect(desconocido).toEqual(mala);
    });

    it('valida el formato de la solicitud', async () => {
      const error = await fallo('login_user', { email: 'x', password: '' });
      expect(error.status).toBe(400);
    });
  });

  describe('tokens', () => {
    let sesion: { accessToken: string; refreshToken: string; user: any };

    beforeEach(async () => {
      await enviar('create_user', usuario);
      sesion = await enviar('login_user', {
        email: usuario.email,
        password: usuario.password,
      });
    });

    it('valida un token de acceso y devuelve la identidad', async () => {
      const identidad = await enviar('validate_token', sesion.accessToken);
      expect(identidad).toEqual({
        userId: sesion.user.id,
        email: usuario.email,
      });
    });

    it('no acepta el refresh token como token de acceso', async () => {
      const error = await fallo('validate_token', sesion.refreshToken);
      expect(error.status).toBe(401);
    });

    it('no acepta tokens manipulados ni basura', async () => {
      const alterado = sesion.accessToken.slice(0, -3) + 'abc';
      expect((await fallo('validate_token', alterado)).status).toBe(401);
      expect((await fallo('validate_token', 'no-es-un-token')).status).toBe(
        401,
      );
      expect((await fallo('validate_token', { x: 1 })).status).toBe(401);
    });

    it('no acepta un token vencido', async () => {
      const vencido = jwt.sign(
        { sub: sesion.user.id, email: usuario.email, typ: 'access' },
        { expiresIn: -10 },
      );
      expect((await fallo('validate_token', vencido)).status).toBe(401);
    });

    it('no acepta un token firmado con otro secreto', async () => {
      const ajeno = new JwtService({ secret: 'otro-secreto'.repeat(4) }).sign({
        sub: sesion.user.id,
        email: usuario.email,
        typ: 'access',
      });
      expect((await fallo('validate_token', ajeno)).status).toBe(401);
    });

    it('invalida el token cuando el usuario ya no existe', async () => {
      await conexion.collection('users').deleteMany({});
      expect((await fallo('validate_token', sesion.accessToken)).status).toBe(
        401,
      );
    });

    it('renueva la sesión con el refresh token', async () => {
      const nuevos = await enviar('refresh_token', sesion.refreshToken);
      expect(nuevos.accessToken).toEqual(expect.any(String));
      const identidad = await enviar('validate_token', nuevos.accessToken);
      expect(identidad.email).toBe(usuario.email);
    });

    it('no renueva con un token de acceso', async () => {
      const error = await fallo('refresh_token', sesion.accessToken);
      expect(error).toEqual({ status: 401, message: 'Refresh token inválido' });
    });
  });

  describe('consulta de usuarios', () => {
    it('lista usuarios sin contraseñas', async () => {
      await enviar('create_user', usuario);
      await enviar('create_user', { ...usuario, email: 'beto@remi.cl' });
      const lista = await enviar<any[]>('get_all_users');
      expect(lista).toHaveLength(2);
      expect(JSON.stringify(lista)).not.toMatch(/password/);
    });

    it('devuelve una lista vacía cuando no hay usuarios', async () => {
      expect(await enviar('get_all_users')).toEqual([]);
    });

    it('busca por ID', async () => {
      const creado = await enviar('create_user', usuario);
      const encontrado = await enviar('find_user_by_id', creado.id);
      expect(encontrado.email).toBe(usuario.email);
    });

    it('busca varios usuarios por ID sin exponer contraseñas', async () => {
      const ana = await enviar('create_user', usuario);
      await enviar('create_user', { ...usuario, email: 'beto@remi.cl' });
      const lista = await enviar<any[]>('find_users_by_ids', {
        ids: [ana.id, '507f1f77bcf86cd799439011'],
      });
      expect(lista.map((u) => u.email as string)).toEqual(['ana@remi.cl']);
      expect(JSON.stringify(lista)).not.toMatch(/password/);
      expect(await enviar('find_users_by_ids', { ids: [] })).toEqual([]);
      expect((await fallo('find_users_by_ids', { ids: ['x'] })).status).toBe(
        400,
      );
    });

    it('distingue ID inválido de usuario inexistente', async () => {
      expect((await fallo('find_user_by_id', 'abc')).status).toBe(400);
      expect(
        (await fallo('find_user_by_id', '507f1f77bcf86cd799439011')).status,
      ).toBe(404);
    });
  });
});
