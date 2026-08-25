import { FastifyPluginAsync } from 'fastify';
import { redisPublisher, redisSubscriber } from '../../lib/redis';
import { db } from '../../db';
import { messages, channels, communityMembers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import type { WebSocket } from 'ws';

const channelSockets = new Map<string, Set<WebSocket>>();

export const realtimeGateway: FastifyPluginAsync = async (server) => {
  redisSubscriber.on('message', (redisChannel, messageStr) => {
    const channelId = redisChannel.split(':')[1];
    const sockets = channelSockets.get(channelId);

    if (sockets && sockets.size > 0) {
      for (const socket of sockets) {
        if (socket.readyState === socket.OPEN) {
          socket.send(messageStr);
        }
      }
    }
  });

  server.get('/ws/channels/:channelId', { websocket: true }, async (socket, req) => {
    const { channelId } = req.params as { channelId: string };
    const query = req.query as { token?: string };

    if (!query.token) {
      socket.close(1008, 'Token required');
      return;
    }

    let user: { id: string; username: string };
    try {
      user = server.jwt.verify(query.token) as { id: string; username: string };
    } catch {
      socket.close(1008, 'Invalid token');
      return;
    }

    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) {
      socket.close(1008, 'Channel not found');
      return;
    }

    const [membership] = await db.select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, channel.communityId), eq(communityMembers.userId, user.id)))
      .limit(1);

    if (!membership) {
      socket.close(1008, 'Access denied');
      return;
    }

    if (!channelSockets.has(channelId)) {
      channelSockets.set(channelId, new Set());
      await redisSubscriber.subscribe(`channel:${channelId}`);
    }
    channelSockets.get(channelId)!.add(socket);

    await redisPublisher.publish(`channel:${channelId}`, JSON.stringify({
      event: 'USER_JOINED',
      data: { id: user.id, username: user.username }
    }));

    socket.on('message', async (raw:Buffer) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (!payload.content || typeof payload.content !== 'string') return;

        const [savedMessage] = await db.insert(messages).values({
          channelId,
          senderId: user.id,
          content: payload.content,
        }).returning();

        const broadcastPayload = JSON.stringify({
          event: 'NEW_MESSAGE',
          data: {
            ...savedMessage,
            sender: { id: user.id, username: user.username },
          },
        });

        await redisPublisher.publish(`channel:${channelId}`, broadcastPayload);
      } catch (err) {
        server.log.error(err);
      }
    });

    socket.on('close', async () => {
      const sockets = channelSockets.get(channelId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          channelSockets.delete(channelId);
          await redisSubscriber.unsubscribe(`channel:${channelId}`);
        }
      }
      await redisPublisher.publish(`channel:${channelId}`, JSON.stringify({
        event: 'USER_LEFT',
        data: { id: user.id, username: user.username }
      }));
    });
  });
};