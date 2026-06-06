import { type FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {});
};
