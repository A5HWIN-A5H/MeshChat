import { FastifyPluginAsync } from 'fastify';

export const usersRoutes: FastifyPluginAsync = async (server) => {
  
  
  server.get('/me', {
    preValidation: [server.authenticate]
  }, async (request, reply) => {
    
    
    return reply.status(200).send({
      user: request.user
    });
  });

};