import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prototypesTable = pgTable("prototypes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  prompt: text("prompt"),
  generatedContent: text("generated_content"),
  imageUrl: text("image_url"),
  mediaUrls: text("media_urls"), // JSON array of uploaded media URLs
  audioUrl: text("audio_url"),   // Single background track
  published: boolean("published").notNull().default(false),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrototypeSchema = createInsertSchema(prototypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrototype = z.infer<typeof insertPrototypeSchema>;
export type Prototype = typeof prototypesTable.$inferSelect;
