import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

// status: open | resolved
export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  prototypeId: integer("prototype_id").notNull(),
  reason: text("reason").notNull(), // Spam | Inappropriate | Misleading | Other
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
