import { pgTable, uuid, varchar, text, timestamp, primaryKey, pgEnum } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  publicKey: text('public_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const communities = pgTable('communities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').references(() => users.id).notNull(), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const communityMembers = pgTable('community_members', {
  communityId: uuid('community_id').references(() => communities.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.communityId, table.userId] })
}));

export const channelTypeEnum = pgEnum('channel_type', ['TEXT', 'VOICE', 'ANNOUNCEMENT']);

export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  communityId: uuid('community_id')
    .references(() => communities.id, { onDelete: 'cascade' })
    .notNull(),
    
  name: varchar('name', { length: 255 }).notNull(),
  
  type: channelTypeEnum('type').default('TEXT').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  channelId: uuid('channel_id')
    .references(() => channels.id, { onDelete: 'cascade' })
    .notNull(),
    
  senderId: uuid('sender_id')
    .references(() => users.id)
    .notNull(),

  content: text('content').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

