# Remi Recetas · Servicio de usuarios

[![CI](https://github.com/florenciaPenaSepulveda/remi-ms-users/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florenciaPenaSepulveda/remi-ms-users/actions/workflows/ci.yml)

Microservicio de **Remi Recetas** que guarda a los usuarios y emite sus sesiones. No expone HTTP: escucha mensajes en una cola de RabbitMQ y responde al [gateway](https://github.com/florenciaPenaSepulveda/remi-gateway), que es la única puerta de entrada del sistema. Hecho con NestJS 11 y MongoDB.

## Repositorios del sistema

| Repositorio | Función |
|---|---|
| [remi-gateway](https://github.com/florenciaPenaSepulveda/remi-gateway) | API HTTP pública, autenticación y enrutamiento |
| **remi-ms-users** (este) | Usuarios, inicio de sesión y tokens |
| [remi-ms-recetas](https://github.com/florenciaPenaSepulveda/remi-ms-recetas) | Recetas e ingredientes |
| [remi-ms-tags](https://github.com/florenciaPenaSepulveda/remi-ms-tags) | Etiquetas de las recetas |
| [remi-ms-socials](https://github.com/florenciaPenaSepulveda/remi-ms-socials) | Me gusta y comentarios |
| [remi-frontend](https://github.com/florenciaPenaSepulveda/remi-frontend) | Aplicación web en React |

## Mensajes que atiende

| Patrón | Datos | Respuesta |
|---|---|---|
| `create_user` | `name`, `email`, `password` | Usuario público (`id`, `name`, `email`, `createdAt`) |
| `login_user` | `email`, `password` | `accessToken`, `refreshToken` y `user` |
| `validate_token` | token de acceso | `userId` y `email`, o error 401 |
| `refresh_token` | refresh token | Un par nuevo de tokens |
| `get_all_users` | — | Lista de usuarios públicos |
| `find_user_by_id` | `id` | Usuario público |
| `find_users_by_ids` | `ids` (hasta 100) | Lista de usuarios públicos |

Los errores viajan como `{ status, message }` (400 datos inválidos, 401 credenciales o token inválidos, 404 inexistente, 409 correo repetido) y el gateway los convierte en respuestas HTTP.

## Seguridad

- Las contraseñas se guardan con bcrypt y nunca salen del servicio: el campo está excluido de las consultas y de todas las respuestas.
- Los tokens son JWT firmados con HS256 y llevan un tipo (`access` o `refresh`); un refresh token no sirve como token de acceso ni al revés. Duran 15 minutos y 7 días por defecto.
- Cada validación comprueba que el usuario siga existiendo.
- Un correo desconocido y una contraseña errónea responden lo mismo y tardan parecido, para no revelar qué cuentas existen.
- Los datos se validan y se rechazan los campos que no corresponden: correo válido, nombre de 2 a 60 caracteres y contraseña de 8 a 72 con letra y número. Los correos se guardan en minúsculas.
- El servicio no arranca sin un `JWT_SECRET` de al menos 32 caracteres.
- No se versiona ningún `.env`.

## Requisitos

- Node.js 24 (ver `.nvmrc`).
- MongoDB y RabbitMQ. El `docker-compose.yml` del gateway los levanta.

## Puesta en marcha

```bash
cp .env.example .env
npm ci
npm run start:dev
```

| Variable | Descripción | Por defecto |
|---|---|---|
| `MONGODB_URI` | Conexión a MongoDB | obligatoria |
| `JWT_SECRET` | Secreto de los tokens (mínimo 32 caracteres) | obligatoria |
| `AMQP_URI` | Conexión a RabbitMQ | `amqp://localhost:5672` |
| `USERS_QUEUE` | Cola que escucha | `users_queue` |
| `ACCESS_TOKEN_TTL` | Duración del token de acceso | `15m` |
| `REFRESH_TOKEN_TTL` | Duración del refresh token | `7d` |
| `BCRYPT_ROUNDS` | Costo del hash | `10` |

`JWT_SECRET` solo lo usa este servicio: el gateway no lo conoce porque valida los tokens preguntándole a este.

## Pruebas

```bash
npm test
npm run test:cov
npm run lint
```

Las pruebas levantan el servicio completo (validación y errores incluidos) sobre transporte TCP y lo consultan como lo haría el gateway; necesitan una MongoDB en `MONGODB_URI` (por defecto `mongodb://localhost:27018/remi_users_test`) y borran su base de pruebas al terminar. El CI ejecuta lint, compilación y pruebas con cobertura.

## Docker

```bash
docker build -t remi-ms-users .
docker run --env-file .env remi-ms-users
```

## Autoría

Proyecto desarrollado en equipo durante la carrera. Esta copia forma parte del portafolio de [Florencia Peña Sepúlveda](https://github.com/florenciaPenaSepulveda), que la revisó, corrigió y documentó.
