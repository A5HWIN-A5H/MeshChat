import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import dotenv from 'dotenv';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';


dotenv.config();

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});


server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!
});


server.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }
});

server.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});


server.register(authRoutes, { prefix: '/api/v1/auth' });
server.register(usersRoutes, { prefix: '/api/v1/users' });

async function start() {
  try {
    await server.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();