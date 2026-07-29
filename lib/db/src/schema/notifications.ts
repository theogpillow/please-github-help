import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),       // recipient
  type: text("type").notNull(),               // follow | like | message | mention | verified
  actorId: integer("actor_id"),              // who triggered it (null for system/admin actions)
  prototypeId: integer("prototype_id"),      // relevant post (like, mention)
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
