import { pgTable, text, numeric, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetCatalogTable = pgTable("asset_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  change24h: numeric("change_24h", { precision: 8, scale: 4 }).notNull().default("0"),
  logoUrl: text("logo_url"),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supportTicketsTable = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetCatalogTable).omit({ id: true, createdAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetCatalogTable.$inferSelect;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
