process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/remi_users_test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'secreto-de-pruebas-con-mas-de-32-caracteres';
process.env.BCRYPT_ROUNDS = '4';
process.env.NODE_ENV = 'test';
