import { FastifyInstance } from 'fastify';
import { userRoutes } from './user.route';
import { authRoutes } from './auth.routes';
import { disciplinaRoutes } from './disciplina.route';

export async function routes(instance: FastifyInstance) {
  await instance.register(userRoutes, {
    prefix: '/user',
  });

  await instance.register(authRoutes, {
    prefix: '/auth',
  });

  await instance.register(disciplinaRoutes, {
    prefix: '/disciplinas',
  });
}
