import { pgTable, text } from "drizzle-orm/pg-core";

// key-value store for global app settings (e.g. pre_moderation = "true"/"false")
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type AppSetting = typeof appSettingsTable.$inferSelect;
