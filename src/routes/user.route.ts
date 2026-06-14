import { type FastifyPluginAsync, type FastifyReply } from 'fastify';
import { UserService } from '../models/user/User';
import { AppError } from '../models/user/errors';
import { UserRepository } from '../repositories/user/UserRepository';

function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      message: error.message,
      ...('issues' in error ? { issues: error.issues } : {}),
    });
  }
  throw error;
}

function parseId(rawId: string, reply: FastifyReply): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    reply.code(400).send({ message: 'Id inválido' });
    return null;
  }
  return id;
}

export const userRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const repository = new UserRepository(fastify.prisma);
  const userService = new UserService(repository);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/', async (request, reply) => {
    try {
      const user = await userService.create(request.user!, request.body);
      return reply.code(201).send(user);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/me', async (request, reply) => {
    try {
      return await userService.getMe(request.user!);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/', async (request, reply) => {
    try {
      return await userService.list(request.user!);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = parseId(request.params.id, reply);
    if (id === null) return reply;

    try {
      return await userService.getById(request.user!, id);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = parseId(request.params.id, reply);
    if (id === null) return reply;

    try {
      return await userService.update(request.user!, id, request.body);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = parseId(request.params.id, reply);
    if (id === null) return reply;

    try {
      await userService.delete(request.user!, id);
      return reply.code(204).send();
    } catch (error) {
      return handleError(error, reply);
    }
  });
};
