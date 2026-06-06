import { type FastifyPluginAsync } from 'fastify';

export const userRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/user', async function (request, reply) {
    return 'this is an example';
  });
};
