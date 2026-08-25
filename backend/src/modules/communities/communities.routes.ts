import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db';
import { communities, communityMembers } from '../../db/schema';

export const communitiesRoutes: FastifyPluginAsync = async (server) => {
  
  server.post('/', {
    preValidation: [server.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 255 },
          description: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { name, description } = request.body as any;
    
    const userId = request.user.id; 

    try {
      const newCommunity = await db.transaction(async (tx) => {
        const [community] = await tx.insert(communities).values({
          name,
          description,
          ownerId: userId,
        }).returning();

        await tx.insert(communityMembers).values({
          communityId: community.id,
          userId: userId,
        });

        return community;
      });

      return reply.status(201).send({
        message: 'Community created successfully',
        community: newCommunity
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create community' } 
      });
    }
  });
};