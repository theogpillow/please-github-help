import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const savesTable = pgTable(
  "saves",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    prototypeId: integer("prototype_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("saves_user_prototype_uniq").on(t.userId, t.prototypeId)],
);
