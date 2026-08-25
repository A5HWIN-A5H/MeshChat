import { eq, and } from 'drizzle-orm';
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

  
  server.get('/explore', {
    preValidation: [server.authenticate]
  }, async (request, reply) => {
    try {
      const allCommunities = await db.select().from(communities);
      return reply.status(200).send({ communities: allCommunities });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch communities for exploration' } 
      });
    }
  });

  
  server.get('/', {
    preValidation: [server.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id;

    try {
      const myCommunities = await db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
          ownerId: communities.ownerId,
          joinedAt: communityMembers.joinedAt,
        })
        .from(communities)
        .innerJoin(
          communityMembers, 
          eq(communities.id, communityMembers.communityId)
        )
        .where(eq(communityMembers.userId, userId));

      return reply.status(200).send({
        communities: myCommunities
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch communities' } 
      });
    }
  });

  
  server.post('/:id/join', {
    preValidation: [server.authenticate]
  }, async (request, reply) => {
    const { id: communityId } = request.params as { id: string };
    const userId = request.user.id;

    try {
      
      const existing = await db
        .select()
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, userId)
          )
        );

      if (existing.length > 0) {
        return reply.status(400).send({
          error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this community' }
        });
      }

      await db.insert(communityMembers).values({
        communityId,
        userId,
      });

      return reply.status(200).send({ message: 'Successfully joined community' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to join community' } 
      });
    }
  });
};