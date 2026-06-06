import { type FastifyPluginAsync } from 'fastify'

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/user', async function (request, reply) {
    return 'this is an example'
  })
}

export default example
