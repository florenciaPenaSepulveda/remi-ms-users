import { validarEntorno } from './env';

const base = {
  MONGODB_URI: 'mongodb://localhost:27017/remi',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validarEntorno', () => {
  it('aplica valores por defecto', () => {
    const env = validarEntorno(base);
    expect(env.AMQP_URI).toBe('amqp://localhost:5672');
    expect(env.USERS_QUEUE).toBe('users_queue');
    expect(env.ACCESS_TOKEN_TTL).toBe('15m');
    expect(env.REFRESH_TOKEN_TTL).toBe('7d');
    expect(env.BCRYPT_ROUNDS).toBe(10);
  });

  it('convierte las rondas de bcrypt a número', () => {
    expect(validarEntorno({ ...base, BCRYPT_ROUNDS: '12' }).BCRYPT_ROUNDS).toBe(
      12,
    );
  });

  it('rechaza un secreto JWT corto', () => {
    expect(() => validarEntorno({ ...base, JWT_SECRET: 'corto' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('exige la URI de MongoDB', () => {
    expect(() => validarEntorno({ JWT_SECRET: base.JWT_SECRET })).toThrow(
      /MONGODB_URI/,
    );
  });

  it('rechaza rondas de bcrypt fuera de rango', () => {
    expect(() => validarEntorno({ ...base, BCRYPT_ROUNDS: '30' })).toThrow(
      /BCRYPT_ROUNDS/,
    );
  });
});
