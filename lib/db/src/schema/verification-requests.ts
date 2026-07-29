import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

// status: pending | approved | rejected
export const verificationRequestsTable = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type VerificationRequest = typeof verificationRequestsTable.$inferSelect;
