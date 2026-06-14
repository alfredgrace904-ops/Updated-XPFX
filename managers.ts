import { pgTable, text, numeric, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const managersTable = pgTable("managers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  title: text("title").notNull(),
  experience: integer("experience").notNull().default(1),
  strategy: text("strategy").notNull(),
  performance: numeric("performance", { precision: 5, scale: 2 }).notNull().default("0"),
  totalClients: integer("total_clients").notNull().default(0),
  winRate: numeric("win_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  specialization: text("specialization").notNull(),
  bio: text("bio").notNull().default(""),
  contactEmail: text("contact_email").notNull(),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertManagerSchema = createInsertSchema(managersTable).omit({ id: true, createdAt: true });
export type InsertManager = z.infer<typeof insertManagerSchema>;
export type Manager = typeof managersTable.$inferSelect;
