import { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, or } from 'drizzle-orm';

// Fastify plugin to encapsulate our auth routes
export const authRoutes: FastifyPluginAsync = async (server) => {
  
  // POST /register
  server.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    }
  }, async (request, reply) => {
    const { username, email, password } = request.body as any;

    try {
      // 1. Check if user already exists
      const existingUser = await db.select()
        .from(users)
        .where(or(eq(users.email, email), eq(users.username, username)))
        .limit(1);

      if (existingUser.length > 0) {
        return reply.status(409).send({ 
          error: { code: 'USER_EXISTS', message: 'Username or email already in use' } 
        });
      }

      // 2. Hash the password using Argon2id
      const passwordHash = await argon2.hash(password);

      // 3. Insert the new user into PostgreSQL
      const [newUser] = await db.insert(users).values({
        username,
        email,
        passwordHash,
      }).returning({ 
        id: users.id, 
        username: users.username, 
        email: users.email 
      });

      return reply.status(201).send({
        message: 'User registered successfully',
        user: newUser
      });

    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to register user' } 
      });
    }
  });
};