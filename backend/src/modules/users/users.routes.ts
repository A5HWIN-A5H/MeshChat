import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const usersRoutes: FastifyPluginAsync = async (server) => {
  
  server.get('/me', {
    preValidation: [server.authenticate]
  }, async (request, reply) => {
    return reply.status(200).send({
      user: request.user
    });
  });

  server.post('/keys', {
    preValidation: [server.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['publicKey'],
        properties: {
          publicKey: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { publicKey } = request.body as any;

    try {
      await db.update(users)
        .set({ publicKey, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return reply.status(200).send({
        message: 'Public key updated successfully'
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update public key' } 
      });
    }
  });

  server.get('/:id/keys', {
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const [user] = await db.select({
        id: users.id,
        username: users.username,
        publicKey: users.publicKey
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

      if (!user) {
        return reply.status(404).send({ 
          error: { code: 'NOT_FOUND', message: 'User not found' } 
        });
      }

      if (!user.publicKey) {
        return reply.status(404).send({ 
          error: { code: 'KEY_NOT_FOUND', message: 'User has not uploaded a public key' } 
        });
      }

      return reply.status(200).send({
        user: {
          id: user.id,
          username: user.username,
          publicKey: user.publicKey
        }
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch public key' } 
      });
    }
  });  
};