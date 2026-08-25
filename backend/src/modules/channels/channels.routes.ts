import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db';
import { channels, communityMembers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const channelsRoutes: FastifyPluginAsync = async (server) => {
  
  server.post('/:communityId/channels', {
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['communityId'],
        properties: { communityId: { type: 'string', format: 'uuid' } }
      },
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          type: { type: 'string', enum: ['TEXT', 'VOICE', 'ANNOUNCEMENT'] }
        }
      }
    }
  }, async (request, reply) => {
    const { communityId } = request.params as any;
    const { name, type } = request.body as any;
    const userId = request.user.id;

    try {
      const [membership] = await db.select()
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, userId)
          )
        )
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ 
          error: { code: 'FORBIDDEN', message: 'You do not have access to this community' } 
        });
      }

      const [newChannel] = await db.insert(channels).values({
        communityId,
        name,
        type: type || 'TEXT', 
      }).returning();

      return reply.status(201).send({
        message: 'Channel created successfully',
        channel: newChannel
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create channel' } 
      });
    }
  });

  server.get('/:communityId/channels', {
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['communityId'],
        properties: { communityId: { type: 'string', format: 'uuid' } }
      }
    }
  }, async (request, reply) => {
    const { communityId } = request.params as any;
    const userId = request.user.id;

    try {
      
      const [membership] = await db.select()
        .from(communityMembers)
        .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ 
          error: { code: 'FORBIDDEN', message: 'You do not have access to this community' } 
        });
      }

      const communityChannels = await db.select()
        .from(channels)
        .where(eq(channels.communityId, communityId));

      return reply.status(200).send({
        channels: communityChannels
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch channels' } 
      });
    }
  });

};