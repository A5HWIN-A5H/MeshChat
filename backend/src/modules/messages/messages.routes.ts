import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db';
import { channels, communityMembers, messages } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const messagesRoutes: FastifyPluginAsync = async (server) => {
  
  async function verifyChannelAccess(channelId: string, userId: string) {
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) return null;

    const [membership] = await db.select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, channel.communityId), eq(communityMembers.userId, userId)))
      .limit(1);

    return membership ? channel : null;
  }

  server.post('/:channelId/messages', {
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['channelId'],
        properties: { channelId: { type: 'string', format: 'uuid' } }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: { content: { type: 'string', minLength: 1 } }
      }
    }
  }, async (request, reply) => {
    const { channelId } = request.params as any;
    const { content } = request.body as any;
    const userId = request.user.id;

    try {
      const hasAccess = await verifyChannelAccess(channelId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const [newMessage] = await db.insert(messages).values({
        channelId,
        senderId: userId,
        content
      }).returning();

      return reply.status(201).send({
        message: 'Message sent successfully',
        data: newMessage
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send message' } });
    }
  });

  server.get('/:channelId/messages', {
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['channelId'],
        properties: { channelId: { type: 'string', format: 'uuid' } }
      }
    }
  }, async (request, reply) => {
    const { channelId } = request.params as any;
    const userId = request.user.id;

    try {
      const hasAccess = await verifyChannelAccess(channelId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const chatHistory = await db.select()
        .from(messages)
        .where(eq(messages.channelId, channelId))
        .orderBy(desc(messages.createdAt))
        .limit(50);

      return reply.status(200).send({
        messages: chatHistory
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch messages' } });
    }
  });

};