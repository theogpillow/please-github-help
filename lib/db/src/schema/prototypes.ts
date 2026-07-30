import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// status: draft (not published) | pending (awaiting pre-mod) | approved (live) | hidden (admin-hidden) | deleted (soft-deleted)
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
  songTitle: text("song_title"),       // Track name from iTunes search
  songArtist: text("song_artist"),     // Artist name from iTunes search
  songArtworkUrl: text("song_artwork_url"), // Album art URL from iTunes
  audioStartTime: real("audio_start_time"), // Segment start in seconds (null = beginning)
  audioEndTime: real("audio_end_time"),     // Segment end in seconds (null = full track)
  published: boolean("published").notNull().default(false),
  status: text("status").notNull().default("approved"), // moderation status
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrototypeSchema = createInsertSchema(prototypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrototype = z.infer<typeof insertPrototypeSchema>;
export type Prototype = typeof prototypesTable.$inferSelect;
